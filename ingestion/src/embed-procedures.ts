/**
 * Build the procedures collection + generate Vertex AI embeddings for semantic search
 *
 * Phase 1: Seed procedures from unique DRG/APC codes found in the prices collection.
 *   - Creates documents with code, code_type, description, plain_name, category, setting
 *   - Derives plain_name via a short lookup + fallback to CMS description
 *
 * Phase 2: Generate text embeddings via Vertex AI text-embedding-004 model.
 *   - Input: "{plain_name} {description} {aliases.join(' ')}"
 *   - Stores 768-dim vector in procedures.embedding
 *   - This powers Atlas Vector Search in the searchProcedures MCP tool
 *
 * Atlas Vector Search index must be created manually in Atlas UI or via Atlas CLI:
 *   {
 *     "fields": [{
 *       "type": "vector",
 *       "path": "embedding",
 *       "numDimensions": 768,
 *       "similarity": "cosine"
 *     }]
 *   }
 */

import { closeDb, getDb } from './db.js'
import type { Procedure } from './types.js'

const VERTEX_PROJECT = process.env['GCP_PROJECT_ID'] ?? ''
const VERTEX_LOCATION = process.env['VERTEX_AI_LOCATION'] ?? 'us-central1'
const EMBED_MODEL = 'text-embedding-004'
const EMBED_BATCH_SIZE = 5   // Vertex AI embedding API: 5 texts per request to stay safe
const EMBED_DELAY_MS = 100

// DRG category lookup (simplified — maps DRG ranges to MDC categories)
function drgCategory(code: string): string {
  const n = parseInt(code, 10)
  if (isNaN(n)) return 'Other'
  if (n >= 1 && n <= 42) return 'Nervous System'
  if (n >= 52 && n <= 103) return 'Eye'
  if (n >= 113 && n <= 125) return 'Ear, Nose, Throat'
  if (n >= 129 && n <= 159) return 'Respiratory'
  if (n >= 163 && n <= 208) return 'Circulatory'
  if (n >= 215 && n <= 265) return 'Musculoskeletal'
  if (n >= 280 && n <= 316) return 'Cardiac'
  if (n >= 326 && n <= 395) return 'Digestive'
  if (n >= 405 && n <= 446) return 'Hepatobiliary'
  if (n >= 453 && n <= 517) return 'Musculoskeletal'
  if (n >= 518 && n <= 520) return 'Burns'
  if (n >= 533 && n <= 566) return 'Musculoskeletal'
  if (n >= 570 && n <= 607) return 'Skin & Subcutaneous Tissue'
  if (n >= 614 && n <= 645) return 'Endocrine & Nutritional'
  if (n >= 652 && n <= 700) return 'Kidney & Urinary'
  if (n >= 707 && n <= 730) return 'Male Reproductive'
  if (n >= 734 && n <= 761) return 'Female Reproductive'
  if (n >= 765 && n <= 782) return 'Obstetrics'
  if (n >= 789 && n <= 795) return 'Neonatal'
  if (n >= 799 && n <= 804) return 'Blood'
  if (n >= 808 && n <= 816) return 'Lymphoma & Leukemia'
  if (n >= 820 && n <= 830) return 'Infections'
  if (n >= 840 && n <= 858) return 'Mental Health'
  if (n >= 862 && n <= 872) return 'Alcohol & Drug'
  if (n >= 876 && n <= 887) return 'Trauma'
  if (n >= 894 && n <= 897) return 'Mental Health'
  if (n >= 901 && n <= 909) return 'Trauma'
  if (n >= 927 && n <= 935) return 'Burns'
  if (n >= 939 && n <= 951) return 'Other'
  if (n >= 955 && n <= 965) return 'HIV'
  return 'Other'
}

function apcCategory(code: string): string {
  const n = parseInt(code, 10)
  if (isNaN(n)) return 'Other'
  if (n >= 5000 && n <= 5099) return 'Skin Procedures'
  if (n >= 5100 && n <= 5199) return 'Digestive Procedures'
  if (n >= 5200 && n <= 5299) return 'Musculoskeletal'
  if (n >= 5300 && n <= 5399) return 'Neurological'
  if (n >= 5400 && n <= 5499) return 'Orthopedic'
  if (n >= 5500 && n <= 5599) return 'Urinary'
  if (n >= 5600 && n <= 5699) return 'Gynecology'
  if (n >= 5700 && n <= 5799) return 'Eye'
  if (n >= 5800 && n <= 5899) return 'ENT'
  if (n >= 5900 && n <= 5999) return 'Breast'
  if (n >= 8000 && n <= 8099) return 'Drug Administration'
  if (n >= 8100 && n <= 8199) return 'Chemotherapy'
  return 'Other'
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function getEmbeddings(texts: string[], accessToken: string): Promise<number[][]> {
  const url =
    `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}` +
    `/locations/${VERTEX_LOCATION}/publishers/google/models/${EMBED_MODEL}:predict`

  const body = {
    instances: texts.map((t) => ({ content: t })),
    parameters: { outputDimensionality: 768 },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Vertex AI embedding error ${res.status}: ${msg}`)
  }

  const json = (await res.json()) as {
    predictions: Array<{ embeddings: { values: number[] } }>
  }
  return json.predictions.map((p) => p.embeddings.values)
}

async function getAccessToken(): Promise<string> {
  // Uses Application Default Credentials via metadata server (Cloud Run / GCE)
  // or gcloud CLI token for local development
  const metaUrl =
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token'
  try {
    const res = await fetch(metaUrl, {
      headers: { 'Metadata-Flavor': 'Google' },
      signal: AbortSignal.timeout(2000),
    })
    if (res.ok) {
      const data = (await res.json()) as { access_token: string }
      return data.access_token
    }
  } catch {
    // Not on GCE — fall through to gcloud CLI
  }

  // Local: use gcloud print-access-token
  const { execSync } = await import('child_process')
  try {
    return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim()
  } catch {
    throw new Error(
      'Could not obtain Google access token. Run `gcloud auth application-default login` or set GOOGLE_APPLICATION_CREDENTIALS.'
    )
  }
}

async function run(): Promise<void> {
  const db = await getDb()
  const pricesCol = db.collection('prices')
  const proceduresCol = db.collection<Procedure>('procedures')

  // Indexes
  await proceduresCol.createIndex({ code: 1, code_type: 1 }, { unique: true })
  await proceduresCol.createIndex({ code_type: 1 })
  // Atlas Vector Search index must be created in Atlas UI (cannot be done via driver)
  // See README.md § Atlas Vector Search setup

  // ── Phase 1: Seed procedures from prices ──────────────────────────────────
  console.log('Seeding procedures collection from prices...')
  const uniqueProcedures = await pricesCol
    .aggregate([
      {
        $group: {
          _id: { code: '$procedure_code', code_type: '$procedure_code_type' },
          description: { $first: '$procedure_description' },
          plain_name: { $first: '$plain_name' },
          setting: { $first: '$setting' },
        },
      },
    ])
    .toArray()

  console.log(`  Found ${uniqueProcedures.length.toLocaleString()} unique procedures in prices.`)

  let seeded = 0
  for (const p of uniqueProcedures) {
    const { code, code_type } = p._id as { code: string; code_type: 'DRG' | 'APC' }
    const doc: Omit<Procedure, 'embedding'> = {
      code,
      code_type,
      description: p['description'] as string,
      plain_name: p['plain_name'] as string,
      aliases: [],
      related_codes: [],
      category: code_type === 'DRG' ? drgCategory(code) : apcCategory(code),
      setting: p['setting'] as 'inpatient' | 'outpatient',
    }

    await proceduresCol.updateOne(
      { code, code_type },
      { $setOnInsert: doc },
      { upsert: true }
    )
    seeded++
  }
  console.log(`  Seeded/skipped ${seeded.toLocaleString()} procedures.`)

  // ── Phase 2: Generate embeddings ──────────────────────────────────────────
  if (!VERTEX_PROJECT) {
    console.log('\nGCP_PROJECT_ID not set — skipping embedding generation.')
    console.log('Set GCP_PROJECT_ID and re-run to generate embeddings for Vector Search.')
    await closeDb()
    return
  }

  console.log('\nGenerating Vertex AI embeddings...')
  let accessToken: string
  try {
    accessToken = await getAccessToken()
  } catch (err) {
    console.error('Failed to get access token:', err)
    console.log('Skipping embedding generation.')
    await closeDb()
    return
  }

  const toEmbed = await proceduresCol
    .find({ embedding: { $exists: false } })
    .project({ code: 1, code_type: 1, plain_name: 1, description: 1, aliases: 1 })
    .toArray()

  console.log(`  ${toEmbed.length.toLocaleString()} procedures need embeddings.`)

  let embedded = 0
  for (let i = 0; i < toEmbed.length; i += EMBED_BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + EMBED_BATCH_SIZE)
    const texts = batch.map((p) => {
      const aliases = ((p['aliases'] as string[]) ?? []).join(' ')
      return `${p['plain_name']} ${p['description']} ${aliases}`.trim()
    })

    try {
      const embeddings = await getEmbeddings(texts, accessToken)
      for (let j = 0; j < batch.length; j++) {
        await proceduresCol.updateOne(
          { code: batch[j]!['code'], code_type: batch[j]!['code_type'] },
          { $set: { embedding: embeddings[j] } }
        )
      }
      embedded += batch.length
    } catch (err) {
      console.error(`Embedding batch ${i}-${i + EMBED_BATCH_SIZE} failed:`, err)
    }

    await sleep(EMBED_DELAY_MS)
    if (embedded % 500 === 0) {
      console.log(`  ${embedded.toLocaleString()} / ${toEmbed.length.toLocaleString()} embedded`)
    }
  }

  console.log(`\nEmbed-procedures complete.`)
  console.log(`  Procedures seeded  : ${seeded.toLocaleString()}`)
  console.log(`  Embeddings generated: ${embedded.toLocaleString()}`)
  await closeDb()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

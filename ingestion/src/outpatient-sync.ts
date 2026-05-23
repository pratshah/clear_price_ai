/**
 * Ingest CMS Medicare Outpatient (APC) data → prices collection
 *
 * Source: CMS Medicare Outpatient Hospitals — By Provider and Service (CY 2023)
 * URL: https://data.cms.gov/sites/default/files/2025-08/bceaa5e1-e58c-4109-9f05-832fc5e6bbc8/MUP_OUT_RY25_P04_V10_DY23_Prov_Svc.csv
 *
 * Key columns (raw header → our field):
 *   Rndrng_Prvdr_CCN          → hospital_ccn
 *   APC_Cd                    → procedure_code
 *   APC_Desc                  → procedure_description
 *   Tot_Svcs                  → total_services
 *   Avg_Submtd_Cvrd_Chrg      → avg_submitted_charges
 *   Avg_Mdcr_Alowd_Amt        → avg_medicare_allowed
 */

import { parse } from 'csv-parse'
import { createReadStream, existsSync } from 'fs'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { closeDb, getDb } from './db.js'
import type { Price } from './types.js'

const CSV_URL =
  'https://data.cms.gov/sites/default/files/2025-08/bceaa5e1-e58c-4109-9f05-832fc5e6bbc8/MUP_OUT_RY25_P04_V10_DY23_Prov_Svc.csv'
const LOCAL_CACHE = '/tmp/cms_outpatient_2023.csv'
const BATCH_SIZE = 500
const CMS_YEAR = 2023

// Friendly plain-language names for common APC codes
const APC_PLAIN_NAMES: Record<string, string> = {
  '5071': 'Level 1 skin repair / biopsy',
  '5072': 'Level 2 skin repair',
  '5073': 'Level 3 skin repair',
  '5111': 'Level 1 digestive procedure',
  '5112': 'Level 2 digestive procedure',
  '5113': 'Level 3 digestive procedure',
  '5114': 'Level 4 digestive procedure',
  '5115': 'Level 5 digestive procedure',
  '5116': 'Level 6 digestive procedure',
  '5301': 'Level 1 nerve / muscle procedure',
  '5311': 'Level 1 eye procedure',
  '5312': 'Level 2 eye procedure',
  '5401': 'Level 1 orthopedic procedure',
  '5402': 'Level 2 orthopedic procedure',
  '5461': 'Level 1 urinary procedure',
  '5462': 'Level 2 urinary procedure',
  '5521': 'Level 1 gynecology procedure',
  '5522': 'Level 2 gynecology procedure',
  '8001': 'Level 1 drug administration',
  '8002': 'Level 2 drug administration',
  '8011': 'Chemotherapy injection — low complexity',
  '8012': 'Chemotherapy injection — high complexity',
  '5021': 'Level 1 excision / biopsy / incision & drainage',
  '5022': 'Level 2 excision / biopsy / incision & drainage',
  '5023': 'Level 3 excision / biopsy / incision & drainage',
}

function plainName(apcCode: string, description: string): string {
  return APC_PLAIN_NAMES[apcCode] ?? description
}

async function downloadIfNeeded(): Promise<void> {
  if (existsSync(LOCAL_CACHE)) {
    console.log(`Using cached file: ${LOCAL_CACHE}`)
    return
  }
  console.log(`Downloading CMS Outpatient CSV from:\n  ${CSV_URL}`)
  const res = await fetch(CSV_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading outpatient CSV`)
  if (!res.body) throw new Error('No response body')
  const dest = createWriteStream(LOCAL_CACHE)
  await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), dest)
  console.log(`Saved to ${LOCAL_CACHE}`)
}

async function run(): Promise<void> {
  await downloadIfNeeded()

  const db = await getDb()
  const col = db.collection<Price>('prices')

  // Indexes are created by inpatient-sync.ts; safe to re-run (idempotent)
  await col.createIndex({ hospital_ccn: 1, procedure_code: 1, procedure_code_type: 1 }, { unique: true })
  await col.createIndex({ procedure_code: 1, procedure_code_type: 1 })
  await col.createIndex({ hospital_ccn: 1 })

  let processed = 0
  let inserted = 0
  let batch: Price[] = []

  const flush = async () => {
    if (batch.length === 0) return
    const ops = batch.map((doc) => ({
      updateOne: {
        filter: {
          hospital_ccn: doc.hospital_ccn,
          procedure_code: doc.procedure_code,
          procedure_code_type: doc.procedure_code_type,
        },
        update: { $set: doc },
        upsert: true,
      },
    }))
    const result = await col.bulkWrite(ops, { ordered: false })
    inserted += result.upsertedCount + result.modifiedCount
    batch = []
  }

  const parser = createReadStream(LOCAL_CACHE).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    })
  )

  for await (const row of parser) {
    const ccn: string = String(row['Rndrng_Prvdr_CCN'] ?? '').trim().padStart(6, '0')
    const apcCode: string = String(row['APC_Cd'] ?? '').trim()
    const description: string = String(row['APC_Desc'] ?? '').trim()

    const totalServices = parseFloat(row['Tot_Svcs'] ?? '0') || 0
    const avgSubmittedCharges =
      parseFloat(String(row['Avg_Submtd_Cvrd_Chrg'] ?? '0').replace(/[$,]/g, '')) || 0
    const avgMedicareAllowed =
      parseFloat(String(row['Avg_Mdcr_Alowd_Amt'] ?? '0').replace(/[$,]/g, '')) || 0

    if (!ccn || !apcCode) {
      processed++
      continue
    }

    const doc: Price = {
      hospital_ccn: ccn,
      procedure_code: apcCode,
      procedure_code_type: 'APC',
      procedure_description: description,
      plain_name: plainName(apcCode, description),
      setting: 'outpatient',
      total_services: totalServices,
      avg_submitted_charges: avgSubmittedCharges,
      avg_medicare_allowed: avgMedicareAllowed,
      cms_year: CMS_YEAR,
    }

    batch.push(doc)
    processed++

    if (batch.length >= BATCH_SIZE) {
      await flush()
      if (processed % 50_000 === 0) {
        console.log(`  processed ${processed.toLocaleString()} rows, upserted ${inserted.toLocaleString()}`)
      }
    }
  }

  await flush()
  console.log(`\nOutpatient sync complete.`)
  console.log(`  Total rows processed : ${processed.toLocaleString()}`)
  console.log(`  Total upserted/updated: ${inserted.toLocaleString()}`)
  await closeDb()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

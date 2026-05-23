/**
 * Ingest Leapfrog Hospital Safety Grades → hospitals.quality.leapfrog_safety_grade
 *
 * Leapfrog publishes a public CSV at:
 * https://ratings.leapfroggroup.org/sites/default/files/inline-files/2024-Leapfrog-Hospital-Safety-Grade-Data.csv
 *
 * The file contains hospital name, state, city, and safety grade (A–F).
 * We match hospitals to our MongoDB documents by (name similarity + state) and by
 * CMS Certification Number if available in the file.
 *
 * Note: Leapfrog does not always include CCNs. We fall back to fuzzy name matching
 * normalized to uppercase, stripped of "hospital", "medical center", "health", etc.
 */

import { parse } from 'csv-parse'
import { createReadStream, existsSync } from 'fs'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { closeDb, getDb } from './db.js'

const CSV_URL =
  'https://ratings.leapfroggroup.org/sites/default/files/inline-files/2024-Leapfrog-Hospital-Safety-Grade-Data.csv'
const LOCAL_CACHE = '/tmp/leapfrog_2024.csv'

type LeapfrogGrade = 'A' | 'B' | 'C' | 'D' | 'F'

const VALID_GRADES = new Set<string>(['A', 'B', 'C', 'D', 'F'])

function normalizeHospitalName(name: string): string {
  return name
    .toUpperCase()
    .replace(/\b(HOSPITAL|MEDICAL CENTER|HEALTH SYSTEM|HEALTH CENTER|HEALTHCARE|REGIONAL|MEMORIAL|COMMUNITY|GENERAL|SAINT|ST\.?|MOUNT|MT\.?)\b/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .trim()
}

async function downloadIfNeeded(): Promise<void> {
  if (existsSync(LOCAL_CACHE)) {
    console.log(`Using cached Leapfrog file: ${LOCAL_CACHE}`)
    return
  }
  console.log(`Downloading Leapfrog Safety Grades from:\n  ${CSV_URL}`)
  const res = await fetch(CSV_URL)
  if (!res.ok) {
    // Leapfrog sometimes changes the URL; log the error and skip gracefully
    console.warn(`HTTP ${res.status} — Leapfrog CSV not available. Skipping.`)
    return
  }
  if (!res.body) throw new Error('No response body')
  const dest = createWriteStream(LOCAL_CACHE)
  await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), dest)
  console.log(`Saved to ${LOCAL_CACHE}`)
}

async function run(): Promise<void> {
  await downloadIfNeeded()

  if (!existsSync(LOCAL_CACHE)) {
    console.log('Leapfrog file unavailable — skipping leapfrog-sync.')
    return
  }

  const db = await getDb()
  const col = db.collection('hospitals')

  const parser = createReadStream(LOCAL_CACHE).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    })
  )

  let processed = 0
  let matched = 0
  let unmatched = 0

  for await (const row of parser) {
    const grade = String(row['Hospital Safety Grade'] ?? row['Grade'] ?? '').trim().toUpperCase()
    if (!VALID_GRADES.has(grade)) {
      processed++
      continue
    }

    const hospitalName: string = String(row['Name'] ?? row['Hospital Name'] ?? '').trim()
    const state: string = String(row['State'] ?? '').trim().toUpperCase()
    // Some Leapfrog exports include CMS ID
    const cmsCcn: string = String(row['CMS Certification Number'] ?? row['CCN'] ?? '').trim()

    let filter: Record<string, unknown>

    if (cmsCcn && /^\d{6}$/.test(cmsCcn)) {
      filter = { ccn: cmsCcn }
    } else {
      // Fuzzy name + state match
      const normalized = normalizeHospitalName(hospitalName)
      // We use a regex on stored name normalized at query time — imperfect but practical
      filter = {
        'address.state': state,
        name: { $regex: normalized.slice(0, 12), $options: 'i' },
      }
    }

    const result = await col.updateOne(
      filter,
      {
        $set: {
          'quality.leapfrog_safety_grade': grade as LeapfrogGrade,
          'quality.last_updated': new Date(),
        },
      }
    )

    if (result.matchedCount > 0) {
      matched++
    } else {
      unmatched++
    }
    processed++
  }

  console.log(`\nLeapfrog sync complete.`)
  console.log(`  Grades processed : ${processed.toLocaleString()}`)
  console.log(`  Matched & updated: ${matched.toLocaleString()}`)
  console.log(`  Unmatched        : ${unmatched.toLocaleString()}`)
  await closeDb()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

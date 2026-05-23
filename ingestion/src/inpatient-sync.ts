/**
 * Ingest CMS Medicare Inpatient (DRG) data → prices collection
 *
 * Source: CMS Medicare Inpatient Hospitals — By Provider and Service (FY 2024)
 * URL: https://data.cms.gov/sites/default/files/2026-04/828defb5-c9e6-4442-8c1b-f27bc0799daf/MUP_INP_RY26_P03_V10_DY24_PrvSvc.CSV
 *
 * Key columns (raw header → our field):
 *   Rndrng_Prvdr_CCN          → hospital_ccn
 *   Rndrng_Prvdr_Org_Name     → (not stored in prices; use hospitals collection)
 *   DRG_Cd                    → procedure_code
 *   DRG_Desc                  → procedure_description
 *   Tot_Dschrgs               → total_discharges
 *   Avg_Submtd_Cvrd_Chrg      → avg_covered_charges
 *   Avg_Tot_Pymt_Amt          → avg_total_payments
 *   Avg_Mdcr_Pymt_Amt         → avg_medicare_payments
 */

import { parse } from 'csv-parse'
import { createReadStream, existsSync } from 'fs'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { closeDb, getDb } from './db.js'
import type { Price } from './types.js'

const CSV_URL =
  'https://data.cms.gov/sites/default/files/2026-04/828defb5-c9e6-4442-8c1b-f27bc0799daf/MUP_INP_RY26_P03_V10_DY24_PrvSvc.CSV'
const LOCAL_CACHE = '/tmp/cms_inpatient_2024.csv'
const BATCH_SIZE = 500
const CMS_YEAR = 2024

// Friendly plain-language names for common DRG codes (top 50 by volume)
// Full mapping built by embed-procedures.ts; this is the seed for ingestion display
const DRG_PLAIN_NAMES: Record<string, string> = {
  '470': 'Major joint replacement (hip or knee)',
  '871': 'Septicemia / serious infection (with ventilator)',
  '872': 'Septicemia / serious infection (without ventilator)',
  '291': 'Heart failure with serious complications',
  '292': 'Heart failure with complications',
  '293': 'Heart failure, no complications',
  '690': 'Urinary tract infection with serious complications',
  '603': 'Cellulitis with serious complications',
  '392': 'Digestive disorders with serious complications',
  '641': 'Nutritional / miscellaneous metabolic disorders',
  '194': 'Simple pneumonia / pleurisy with serious complications',
  '195': 'Simple pneumonia / pleurisy with complications',
  '563': 'Fracture of femur (thigh)',
  '482': 'Back & neck procedures',
  '247': 'Coronary stent without heart attack',
  '246': 'Coronary stent with drug-eluting stent',
  '280': 'Heart attack with procedures, serious complications',
  '281': 'Heart attack with procedures, complications',
  '460': 'Spinal fusion — no complications',
  '461': 'Spinal fusion — with complications',
}

function plainName(drgCode: string, description: string): string {
  return DRG_PLAIN_NAMES[drgCode] ?? description
}

async function downloadIfNeeded(): Promise<void> {
  if (existsSync(LOCAL_CACHE)) {
    console.log(`Using cached file: ${LOCAL_CACHE}`)
    return
  }
  console.log(`Downloading CMS Inpatient CSV from:\n  ${CSV_URL}`)
  const res = await fetch(CSV_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading inpatient CSV`)
  if (!res.body) throw new Error('No response body')
  const dest = createWriteStream(LOCAL_CACHE)
  await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), dest)
  console.log(`Saved to ${LOCAL_CACHE}`)
}

async function run(): Promise<void> {
  await downloadIfNeeded()

  const db = await getDb()
  const col = db.collection<Price>('prices')

  // Create indexes (idempotent)
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
    const drgCode: string = String(row['DRG_Cd'] ?? '').trim()
    const description: string = String(row['DRG_Desc'] ?? '').trim()

    const totalDischarges = parseFloat(row['Tot_Dschrgs'] ?? '0') || 0
    const avgCoveredCharges = parseFloat(String(row['Avg_Submtd_Cvrd_Chrg'] ?? '0').replace(/[$,]/g, '')) || 0
    const avgTotalPayments = parseFloat(String(row['Avg_Tot_Pymt_Amt'] ?? '0').replace(/[$,]/g, '')) || 0
    const avgMedicarePayments = parseFloat(String(row['Avg_Mdcr_Pymt_Amt'] ?? '0').replace(/[$,]/g, '')) || 0

    if (!ccn || !drgCode) {
      processed++
      continue
    }

    const doc: Price = {
      hospital_ccn: ccn,
      procedure_code: drgCode,
      procedure_code_type: 'DRG',
      procedure_description: description,
      plain_name: plainName(drgCode, description),
      setting: 'inpatient',
      total_discharges: totalDischarges,
      avg_covered_charges: avgCoveredCharges,
      avg_total_payments: avgTotalPayments,
      avg_medicare_payments: avgMedicarePayments,
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
  console.log(`\nInpatient sync complete.`)
  console.log(`  Total rows processed : ${processed.toLocaleString()}`)
  console.log(`  Total upserted/updated: ${inserted.toLocaleString()}`)
  await closeDb()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

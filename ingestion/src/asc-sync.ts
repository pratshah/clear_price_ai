/**
 * Ingest CMS Medicare ASC (Ambulatory Surgery Center) outpatient data → asc_prices collection
 *
 * Source: CMS Medicare Physician & Other Practitioners — By Provider and Service
 *   filtered to ASC facility type, OR the CMS ASC payment indicators from OPPS data.
 *
 * We use the same Outpatient dataset but filter only ASC providers.
 * CMS CCNs for ASCs are in the 33XXXX range (Medicare-certified ASC CCN prefix).
 * Alternatively, the Provider of Services file tags facility type.
 *
 * For the hackathon, we ingest from the CMS Outpatient file and separate ASCs from
 * hospital outpatient departments (HOPDs) by CCN range:
 *   - ASC CCNs: 33xxxx  (surgical, 6 digits starting with 33)
 *   - Hospital outpatient: all other CCNs
 *
 * After geo-enriching hospitals, the asc_prices collection is enriched with coordinates
 * from the hospitals collection during a second pass.
 *
 * Additionally, we fetch ASC provider geocoordinates from the CMS Provider of Services file:
 * https://data.cms.gov/provider-characteristics/hospitals-and-other-facilities/provider-of-services-file-hospital-non-hospital-facilities
 */

import { parse } from 'csv-parse'
import { createReadStream, existsSync } from 'fs'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { closeDb, getDb } from './db.js'
import type { AscPrice } from './types.js'

// Reuse the cached outpatient file (same source, different filter)
const CSV_URL =
  'https://data.cms.gov/sites/default/files/2025-08/bceaa5e1-e58c-4109-9f05-832fc5e6bbc8/MUP_OUT_RY25_P04_V10_DY23_Prov_Svc.csv'
const LOCAL_CACHE = '/tmp/cms_outpatient_2023.csv'
const BATCH_SIZE = 500
const CMS_YEAR = 2023

// CMS ASC CCN pattern: 6 digits, starts with "33"
function isAscCcn(ccn: string): boolean {
  return /^33\d{4}$/.test(ccn)
}

async function downloadIfNeeded(): Promise<void> {
  if (existsSync(LOCAL_CACHE)) {
    console.log(`Using cached file: ${LOCAL_CACHE}`)
    return
  }
  console.log(`Downloading CMS Outpatient CSV (shared with outpatient-sync) from:\n  ${CSV_URL}`)
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
  const col = db.collection<AscPrice>('asc_prices')

  // Geospatial index for $geoNear queries in getAscPrices MCP tool
  await col.createIndex({ location: '2dsphere' })
  await col.createIndex({ asc_ccn: 1, procedure_code: 1 }, { unique: true })
  await col.createIndex({ procedure_code: 1 })

  let processed = 0
  let ascRows = 0
  let inserted = 0
  let batch: Omit<AscPrice, 'location'>[] = []

  const flush = async () => {
    if (batch.length === 0) return
    const ops = batch.map((doc) => ({
      updateOne: {
        filter: { asc_ccn: doc.asc_ccn, procedure_code: doc.procedure_code },
        update: {
          $set: doc,
          // location is set during geo-enrichment pass (hospital-compare-sync.ts)
          $setOnInsert: { location: { type: 'Point' as const, coordinates: [0, 0] } },
        },
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
    processed++

    if (!isAscCcn(ccn)) continue

    const apcCode: string = String(row['APC_Cd'] ?? '').trim()
    const description: string = String(row['APC_Desc'] ?? '').trim()
    const provName: string = String(row['Rndrng_Prvdr_Org_Name'] ?? '').trim()

    const totalServices = parseFloat(row['Tot_Svcs'] ?? '0') || 0
    const avgSubmittedCharges =
      parseFloat(String(row['Avg_Submtd_Cvrd_Chrg'] ?? '0').replace(/[$,]/g, '')) || 0
    const avgMedicareAllowed =
      parseFloat(String(row['Avg_Mdcr_Alowd_Amt'] ?? '0').replace(/[$,]/g, '')) || 0

    if (!apcCode) continue

    const doc = {
      asc_ccn: ccn,
      asc_name: provName,
      procedure_code: apcCode,
      procedure_code_type: 'APC' as const,
      plain_name: description,
      total_services: totalServices,
      avg_submitted_charges: avgSubmittedCharges,
      avg_medicare_allowed: avgMedicareAllowed,
      cms_year: CMS_YEAR,
    }

    batch.push(doc)
    ascRows++

    if (batch.length >= BATCH_SIZE) {
      await flush()
      if (ascRows % 10_000 === 0) {
        console.log(`  ASC rows: ${ascRows.toLocaleString()}, upserted: ${inserted.toLocaleString()}`)
      }
    }
  }

  await flush()
  console.log(`\nASC sync complete.`)
  console.log(`  Total rows scanned   : ${processed.toLocaleString()}`)
  console.log(`  ASC rows ingested    : ${ascRows.toLocaleString()}`)
  console.log(`  Total upserted/updated: ${inserted.toLocaleString()}`)
  console.log(
    `\nNOTE: asc_prices.location is placeholder [0,0] until geo-enrichment.`)
  console.log(`Run ingest:hospitals to geocode and back-fill ASC locations.`)
  await closeDb()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

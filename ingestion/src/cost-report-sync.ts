/**
 * Ingest CMS Hospital Cost Reports (HCRIS) → hospitals.financials
 *
 * Source: CMS Healthcare Cost Report Information System (HCRIS)
 * Hospital 2552-10 form — cost report FY 2022
 * API: https://data.cms.gov/data-api/v1/dataset/3b79fb31-6dc8-4b47-a95b-1e4e7c530e8a/data
 *
 * Key HCRIS worksheet/line/column → field:
 *   Worksheet S-10, Line 30, Column 3 → total charges
 *   Worksheet S-10, Line 20, Column 3 → charity care cost (uncompensated care)
 *   Worksheet S-10, Line 23, Column 3 → uncompensated care total
 *
 * We use the CMS data API which returns JSON (no CSV download needed).
 * Pagination: offset/limit query params, max 1000 per page.
 */

import { closeDb, getDb } from './db.js'

const BASE_URL = 'https://data.cms.gov/data-api/v1/dataset/3b79fb31-6dc8-4b47-a95b-1e4e7c530e8a/data'
const PAGE_SIZE = 1000

interface HcrisRow {
  provider_ccn?: string
  prvdr_num?: string
  fy_end_dt?: string
  fiscal_year_end?: string
  [key: string]: string | undefined
}

interface FinancialsDoc {
  hospital_ccn: string
  total_charges: number
  charity_care_cost: number
  uncompensated_care: number
  charity_care_ratio: number
  fiscal_year: number
}

async function fetchPage(offset: number): Promise<HcrisRow[]> {
  const url = `${BASE_URL}?offset=${offset}&size=${PAGE_SIZE}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching HCRIS page offset=${offset}`)
  return res.json() as Promise<HcrisRow[]>
}

function parseNum(val: string | undefined): number {
  if (!val) return 0
  return parseFloat(val.replace(/[$,]/g, '')) || 0
}

function fiscalYear(dateStr: string | undefined): number {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? 0 : d.getFullYear()
}

async function run(): Promise<void> {
  const db = await getDb()
  const hospitalsCol = db.collection('hospitals')

  // We'll accumulate the most recent record per CCN before writing
  const byccn = new Map<string, FinancialsDoc>()

  console.log('Fetching HCRIS cost reports via CMS Data API...')
  let offset = 0
  let total = 0

  while (true) {
    const rows = await fetchPage(offset)
    if (rows.length === 0) break

    for (const row of rows) {
      const ccn = (row['provider_ccn'] ?? row['prvdr_num'] ?? '').trim().padStart(6, '0')
      if (!ccn || ccn === '000000') continue

      const fy = fiscalYear(row['fy_end_dt'] ?? row['fiscal_year_end'])

      // HCRIS columns vary by export; try common field names
      const totalCharges = parseNum(row['tot_charges'] ?? row['s10_line30_col3'])
      const charityCare = parseNum(row['charity_care_cost'] ?? row['s10_line20_col3'])
      const uncompensated = parseNum(row['uncompensated_care'] ?? row['s10_line23_col3'])
      const charityRatio = totalCharges > 0 ? charityCare / totalCharges : 0

      const existing = byccn.get(ccn)
      if (!existing || fy > existing.fiscal_year) {
        byccn.set(ccn, {
          hospital_ccn: ccn,
          total_charges: totalCharges,
          charity_care_cost: charityCare,
          uncompensated_care: uncompensated,
          charity_care_ratio: charityRatio,
          fiscal_year: fy,
        })
      }
    }

    total += rows.length
    offset += PAGE_SIZE
    console.log(`  Fetched ${total.toLocaleString()} HCRIS rows...`)
    if (rows.length < PAGE_SIZE) break
  }

  console.log(`\nParsed ${byccn.size.toLocaleString()} unique hospitals from HCRIS.`)
  console.log('Writing financials to hospitals collection...')

  let updated = 0
  for (const fin of byccn.values()) {
    const result = await hospitalsCol.updateOne(
      { ccn: fin.hospital_ccn },
      {
        $set: {
          financials: {
            total_charges: fin.total_charges,
            charity_care_cost: fin.charity_care_cost,
            uncompensated_care: fin.uncompensated_care,
            charity_care_ratio: fin.charity_care_ratio,
            fiscal_year: fin.fiscal_year,
          },
        },
      }
    )
    if (result.matchedCount > 0) updated++
  }

  console.log(`  Updated financials for ${updated.toLocaleString()} hospitals.`)
  console.log(`  No match found for ${(byccn.size - updated).toLocaleString()} CCNs (ASC or not yet ingested).`)
  await closeDb()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

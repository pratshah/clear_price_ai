/**
 * Ingest CMS Doctors & Clinicians (DAC National Downloadable File) → providers collection
 *
 * Source: CMS Provider Data — Doctors and Clinicians
 * Download: https://data.cms.gov/provider-data/dataset/mj5m-pzi6
 * File: DAC_NationalDownloadableFile.csv (~800MB, 3.37M rows)
 * Cached at: /tmp/cms_doctors.csv
 *
 * CSV headers (title-case):
 *   NPI, Provider Last Name, Provider First Name, Cred, pri_spec,
 *   adr_ln_1, City/Town, State, ZIP Code, Telephone Number, ind_assgn
 */

import { parse } from 'csv-parse'
import { createReadStream } from 'fs'
import { closeDb, getDb } from './db.js'
import type { Provider } from './types.js'

const LOCAL_FILE = '/tmp/cms_doctors.csv'
const BATCH_SIZE = 500

async function run(): Promise<void> {
  const db = await getDb()
  const col = db.collection<Provider>('providers')

  await col.createIndex({ npi: 1 }, { unique: true })
  await col.createIndex({ hospital_ccn: 1 })
  await col.createIndex({ location: '2dsphere' })
  await col.createIndex({ specialty: 'text' })

  let total = 0
  let upserted = 0
  let batch: Provider[] = []

  const flush = async () => {
    if (batch.length === 0) return
    const ops = batch.map((doc) => ({
      updateOne: {
        filter: { npi: doc.npi },
        update: { $set: doc },
        upsert: true,
      },
    }))
    const result = await col.bulkWrite(ops, { ordered: false })
    upserted += result.upsertedCount + result.modifiedCount
    batch = []
  }

  console.log(`Reading ${LOCAL_FILE} ...`)

  const parser = createReadStream(LOCAL_FILE).pipe(
    parse({ columns: true, skip_empty_lines: true, trim: true, bom: true })
  )

  for await (const row of parser) {
    const npi = (row['NPI'] ?? '').trim()
    if (!npi || npi.length !== 10) { total++; continue }

    const doc: Provider = {
      npi,
      name: {
        first: (row['Provider First Name'] ?? '').trim(),
        last:  (row['Provider Last Name']  ?? '').trim(),
        credential: (row['Cred'] ?? '').trim() || undefined,
      },
      specialty:     (row['pri_spec']          ?? '').trim(),
      taxonomy_code: '',
      hospital_ccn:  undefined,
      address: {
        street: (row['adr_ln_1']          ?? '').trim(),
        city:   (row['City/Town']         ?? '').trim(),
        state:  (row['State']             ?? '').trim(),
        zip:    (row['ZIP Code']          ?? '').trim().slice(0, 5),
      },
      location: { type: 'Point', coordinates: [0, 0] },
      phone: (row['Telephone Number'] ?? '').trim() || undefined,
      accepting_new_patients:
        row['ind_assgn'] === 'Y' ? true : row['ind_assgn'] === 'N' ? false : undefined,
      cms_quality: {
        medicare_patients: 0,
        quality_score: 0,
        malpractice_flag: false,
        data_year: 2024,
      },
    }

    batch.push(doc)
    total++

    if (batch.length >= BATCH_SIZE) {
      await flush()
      if (total % 200_000 === 0) {
        console.log(`  ${total.toLocaleString()} rows, ${upserted.toLocaleString()} upserted`)
      }
    }
  }

  await flush()
  console.log(`\nDoctors sync complete.`)
  console.log(`  Total rows  : ${total.toLocaleString()}`)
  console.log(`  Upserted    : ${upserted.toLocaleString()}`)
  await closeDb()
}

run().catch((err) => { console.error(err); process.exit(1) })

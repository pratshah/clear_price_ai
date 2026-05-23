/**
 * Ingest CMS Hospital General Information → hospitals collection
 * + geocode each hospital via Google Maps Geocoding API
 * + back-fill asc_prices.location for ASC CCNs found in the same file
 *
 * Source: CMS Provider Data — Hospital General Information
 * URL: https://data.cms.gov/provider-data/sites/default/files/resources/893c372430d9d71a1c52737d01239d47_1777413958/Hospital_General_Information.csv
 *
 * Key columns:
 *   Facility ID           → ccn (zero-padded to 6 digits)
 *   Facility Name         → name
 *   Address               → address.street
 *   City/Town             → address.city
 *   State                 → address.state
 *   ZIP Code              → address.zip
 *   Phone Number          → phone
 *   Hospital Type         → type
 *   Hospital overall rating → quality.cms_star_rating
 *   Emergency Services    → (informational)
 */

import { parse } from 'csv-parse'
import { createReadStream, existsSync } from 'fs'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { closeDb, getDb } from './db.js'
import type { Hospital } from './types.js'

const CSV_URL =
  'https://data.cms.gov/provider-data/sites/default/files/resources/893c372430d9d71a1c52737d01239d47_1777413958/Hospital_General_Information.csv'
const LOCAL_CACHE = '/tmp/cms_hospital_general.csv'
const BATCH_SIZE = 100
const GEOCODE_DELAY_MS = 50 // stay well under Maps API 50 QPS limit

interface GeoResult {
  lat: number
  lng: number
}

async function geocode(address: string, apiKey: string): Promise<GeoResult | null> {
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as {
    status: string
    results: Array<{ geometry: { location: { lat: number; lng: number } } }>
  }
  if (data.status !== 'OK' || !data.results[0]) return null
  return data.results[0].geometry.location
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function downloadIfNeeded(): Promise<void> {
  if (existsSync(LOCAL_CACHE)) {
    console.log(`Using cached file: ${LOCAL_CACHE}`)
    return
  }
  console.log(`Downloading Hospital General Information CSV from:\n  ${CSV_URL}`)
  const res = await fetch(CSV_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading hospital CSV`)
  if (!res.body) throw new Error('No response body')
  const dest = createWriteStream(LOCAL_CACHE)
  await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), dest)
  console.log(`Saved to ${LOCAL_CACHE}`)
}

function parseStar(raw: string): number | undefined {
  const n = parseInt(raw ?? '', 10)
  return isNaN(n) ? undefined : n
}

async function run(): Promise<void> {
  await downloadIfNeeded()

  const mapsApiKey = process.env['GOOGLE_MAPS_API_KEY']
  if (!mapsApiKey) {
    console.warn('GOOGLE_MAPS_API_KEY not set — hospitals will be inserted without geo coordinates')
  }

  const db = await getDb()
  const col = db.collection<Hospital>('hospitals')

  // Indexes
  await col.createIndex({ ccn: 1 }, { unique: true })
  await col.createIndex({ location: '2dsphere' })
  await col.createIndex({ 'address.state': 1 })
  await col.createIndex({ 'address.zip': 1 })

  const parser = createReadStream(LOCAL_CACHE).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    })
  )

  let processed = 0
  let upserted = 0
  let geocoded = 0
  let geoFailed = 0

  for await (const row of parser) {
    const ccn = String(row['Facility ID'] ?? '').trim().padStart(6, '0')
    if (!ccn || ccn === '000000') {
      processed++
      continue
    }

    const street = String(row['Address'] ?? '').trim()
    const city = String(row['City/Town'] ?? '').trim()
    const state = String(row['State'] ?? '').trim()
    const zip = String(row['ZIP Code'] ?? '').trim()
    const name = String(row['Facility Name'] ?? '').trim()
    const phone = String(row['Phone Number'] ?? '').trim()
    const type = String(row['Hospital Type'] ?? '').trim()
    const starRaw = String(row['Hospital overall rating'] ?? '').trim()

    // Check if we already have this hospital with valid coordinates
    const existing = await col.findOne({ ccn }, { projection: { location: 1 } })
    const hasValidCoords =
      existing?.location &&
      (existing.location.coordinates[0] !== 0 || existing.location.coordinates[1] !== 0)

    let location: Hospital['location'] = existing?.location ?? { type: 'Point', coordinates: [0, 0] }

    if (!hasValidCoords && mapsApiKey) {
      const fullAddress = `${street}, ${city}, ${state} ${zip}`
      const geo = await geocode(fullAddress, mapsApiKey)
      if (geo) {
        location = { type: 'Point', coordinates: [geo.lng, geo.lat] }
        geocoded++
      } else {
        geoFailed++
      }
      await sleep(GEOCODE_DELAY_MS)
    }

    const starRating = parseStar(starRaw)

    const doc: Partial<Hospital> = {
      ccn,
      name,
      address: { street, city, state, zip },
      location,
      phone: phone || undefined,
      type: type || undefined,
    }

    if (starRating !== undefined) {
      doc.quality = {
        ...(existing as Hospital | null)?.quality,
        cms_star_rating: starRating,
        last_updated: new Date(),
      } as Hospital['quality']
    }

    await col.updateOne({ ccn }, { $set: doc }, { upsert: true })
    upserted++
    processed++

    if (processed % 500 === 0) {
      console.log(
        `  ${processed.toLocaleString()} processed, ${upserted.toLocaleString()} upserted, ` +
        `${geocoded.toLocaleString()} geocoded, ${geoFailed.toLocaleString()} geo-failed`
      )
    }
  }

  console.log(`\nHospital Compare sync complete.`)
  console.log(`  Total rows processed : ${processed.toLocaleString()}`)
  console.log(`  Total upserted       : ${upserted.toLocaleString()}`)
  console.log(`  Geocoded             : ${geocoded.toLocaleString()}`)
  console.log(`  Geo failed           : ${geoFailed.toLocaleString()}`)

  // Back-fill asc_prices.location from hospitals collection
  // ASC CCNs (33xxxx) won't appear in the Hospital General Info file —
  // their addresses come from the Provider of Services file (npi-sync.ts).
  // This pass enriches any ASC that shares a parent CCN with a hospital.
  console.log(`\nBack-filling asc_prices locations from hospitals...`)
  const ascCol = db.collection('asc_prices')
  const ascCcns = await ascCol.distinct('asc_ccn')
  let ascEnriched = 0

  for (const ccn of ascCcns as string[]) {
    const hospital = await col.findOne(
      { ccn, 'location.coordinates.0': { $ne: 0 } },
      { projection: { location: 1 } }
    )
    if (hospital?.location) {
      await ascCol.updateMany(
        { asc_ccn: ccn, 'location.coordinates.0': 0 },
        { $set: { location: hospital.location } }
      )
      ascEnriched++
    }
  }

  console.log(`  ASC locations back-filled: ${ascEnriched.toLocaleString()}`)
  await closeDb()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

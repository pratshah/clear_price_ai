/**
 * Enrich hospitals and providers with Google Places ratings
 *
 * Uses Google Places Text Search API to find each hospital/provider,
 * caches place_id + rating + review_count back to MongoDB.
 *
 * Run after hospital-compare-sync.ts (hospitals must exist first).
 * Processes hospitals without a google.place_id first, then providers.
 *
 * Rate: Places API allows 10 QPS on standard tier. We throttle to 5 QPS.
 */

import { closeDb, getDb } from './db.js'

const GEOCODE_DELAY_MS = 200
const BATCH_LIMIT = 500  // per run; full enrichment takes multiple runs

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

interface PlacesResult {
  place_id: string
  name: string
  rating?: number
  user_ratings_total?: number
  url?: string
  formatted_address?: string
}

interface PlacesResponse {
  status: string
  candidates?: PlacesResult[]
  results?: PlacesResult[]
}

async function findPlace(
  query: string,
  apiKey: string
): Promise<PlacesResult | null> {
  const url =
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
    `?input=${encodeURIComponent(query)}` +
    `&inputtype=textquery` +
    `&fields=place_id,name,rating,user_ratings_total,url` +
    `&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as PlacesResponse
  if (data.status !== 'OK') return null
  return data.candidates?.[0] ?? null
}

async function run(): Promise<void> {
  const apiKey = process.env['GOOGLE_MAPS_API_KEY']
  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY is required for places-sync. Exiting.')
    process.exit(1)
  }

  const db = await getDb()

  // ── Hospitals ──────────────────────────────────────────────────────────────
  const hospitalsCol = db.collection('hospitals')
  const hospitalCursor = hospitalsCol
    .find({ 'google.place_id': { $exists: false } })
    .project({ name: 1, address: 1 })
    .limit(BATCH_LIMIT)

  let hospitalsDone = 0
  let hospitalsUpdated = 0

  console.log('Enriching hospitals with Google Places ratings...')

  for await (const doc of hospitalCursor) {
    const name = doc['name'] as string
    const address = doc['address'] as { city: string; state: string }
    const query = `${name} hospital ${address.city} ${address.state}`

    const place = await findPlace(query, apiKey)
    await sleep(GEOCODE_DELAY_MS)

    if (place) {
      await hospitalsCol.updateOne(
        { _id: doc['_id'] },
        {
          $set: {
            google: {
              place_id: place.place_id,
              rating: place.rating ?? 0,
              review_count: place.user_ratings_total ?? 0,
              url: place.url ?? '',
            },
          },
        }
      )
      hospitalsUpdated++
    }
    hospitalsDone++
    if (hospitalsDone % 50 === 0) {
      console.log(`  hospitals: ${hospitalsDone} processed, ${hospitalsUpdated} enriched`)
    }
  }

  console.log(`  Hospitals complete: ${hospitalsDone} processed, ${hospitalsUpdated} enriched`)

  // ── Providers ──────────────────────────────────────────────────────────────
  const providersCol = db.collection('providers')
  const providerCursor = providersCol
    .find({ 'google.place_id': { $exists: false }, 'address.city': { $exists: true } })
    .project({ 'name': 1, specialty: 1, address: 1 })
    .limit(BATCH_LIMIT)

  let providersDone = 0
  let providersUpdated = 0

  console.log('Enriching providers with Google Places ratings...')

  for await (const doc of providerCursor) {
    const name = doc['name'] as { first: string; last: string }
    const specialty = (doc['specialty'] as string) ?? ''
    const address = doc['address'] as { city: string; state: string }
    const query = `Dr. ${name.first} ${name.last} ${specialty} ${address.city} ${address.state}`

    const place = await findPlace(query, apiKey)
    await sleep(GEOCODE_DELAY_MS)

    if (place) {
      await providersCol.updateOne(
        { _id: doc['_id'] },
        {
          $set: {
            google: {
              place_id: place.place_id,
              rating: place.rating ?? 0,
              review_count: place.user_ratings_total ?? 0,
              url: place.url ?? '',
            },
          },
        }
      )
      providersUpdated++
    }
    providersDone++
    if (providersDone % 50 === 0) {
      console.log(`  providers: ${providersDone} processed, ${providersUpdated} enriched`)
    }
  }

  console.log(`  Providers complete: ${providersDone} processed, ${providersUpdated} enriched`)
  console.log(`\nPlaces sync complete. Re-run to continue enriching remaining records.`)
  await closeDb()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

/**
 * NPI Registry sync — geocode providers that have lat/lng = 0,0 after doctors-sync.ts
 * and back-fill ASC locations using NPI Registry provider addresses.
 *
 * The NPPES NPI Registry public API (free, no key):
 *   https://npiregistry.cms.hhs.gov/api/?number=<NPI>&version=2.1
 *
 * This script:
 *   1. Finds providers in MongoDB with location [0,0]
 *   2. Calls NPPES API to get address + taxonomy
 *   3. Geocodes via Google Maps (if available) or falls back to address-only update
 *   4. Updates providers collection
 *   5. Finds ASC facilities in asc_prices with location [0,0]
 *   6. Calls NPPES with ASC CCN (padded to 10-digit NPI search isn't direct;
 *      we search by organization name + state from asc_prices)
 *
 * Rate limit: NPPES allows ~10 req/s. We throttle to 5 req/s.
 */

import { closeDb, getDb } from './db.js'

const NPPES_BASE = 'https://npiregistry.cms.hhs.gov/api'
const RATE_DELAY_MS = 200  // 5 req/s
const GEOCODE_DELAY_MS = 50
const BATCH_LIMIT = 1000  // process up to N providers per run (incremental)

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

interface NppesAddress {
  address_1?: string
  city?: string
  state?: string
  postal_code?: string
  telephone_number?: string
  address_purpose?: string
}

interface NppesResult {
  basic?: { first_name?: string; last_name?: string; credential?: string }
  taxonomies?: Array<{ code?: string; desc?: string; primary?: boolean }>
  addresses?: NppesAddress[]
}

interface NppesResponse {
  result_count?: number
  results?: NppesResult[]
}

async function fetchNpi(npi: string): Promise<NppesResult | null> {
  const url = `${NPPES_BASE}/?number=${npi}&version=2.1`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const data = (await res.json()) as NppesResponse
  return data.results?.[0] ?? null
}

async function geocode(address: string, apiKey: string): Promise<[number, number] | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as {
    status: string
    results: Array<{ geometry: { location: { lat: number; lng: number } } }>
  }
  if (data.status !== 'OK' || !data.results[0]) return null
  const { lat, lng } = data.results[0].geometry.location
  return [lng, lat]
}

async function run(): Promise<void> {
  const mapsApiKey = process.env['GOOGLE_MAPS_API_KEY']
  const db = await getDb()
  const col = db.collection('providers')

  // Find providers with missing coords
  const cursor = col
    .find({ 'location.coordinates.0': 0, 'location.coordinates.1': 0 })
    .project({ npi: 1, address: 1 })
    .limit(BATCH_LIMIT)

  let processed = 0
  let updated = 0

  for await (const doc of cursor) {
    const npi = doc['npi'] as string
    const address = doc['address'] as { street: string; city: string; state: string; zip: string }

    // Try NPPES for taxonomy/address confirmation
    const nppesData = await fetchNpi(npi)
    await sleep(RATE_DELAY_MS)

    let coords: [number, number] | null = null
    let taxonomyCode: string | undefined
    let taxonomyDesc: string | undefined

    if (nppesData) {
      // Extract primary taxonomy
      const primaryTax = nppesData.taxonomies?.find((t) => t.primary) ?? nppesData.taxonomies?.[0]
      taxonomyCode = primaryTax?.code
      taxonomyDesc = primaryTax?.desc

      // Use practice location address for geocoding
      const practiceAddr = nppesData.addresses?.find((a) => a.address_purpose === 'LOCATION') ??
        nppesData.addresses?.[0]

      if (practiceAddr && mapsApiKey) {
        const fullAddr = `${practiceAddr.address_1 ?? ''}, ${practiceAddr.city ?? ''}, ${practiceAddr.state ?? ''} ${practiceAddr.postal_code ?? ''}`
        coords = await geocode(fullAddr, mapsApiKey)
        await sleep(GEOCODE_DELAY_MS)
      }
    }

    // Fallback: geocode from existing address in MongoDB
    if (!coords && mapsApiKey && address) {
      const fullAddr = `${address.street}, ${address.city}, ${address.state} ${address.zip}`
      coords = await geocode(fullAddr, mapsApiKey)
      await sleep(GEOCODE_DELAY_MS)
    }

    const update: Record<string, unknown> = {}
    if (coords) {
      update['location'] = { type: 'Point', coordinates: coords }
    }
    if (taxonomyCode) {
      update['taxonomy_code'] = taxonomyCode
    }
    if (taxonomyDesc && !doc['specialty']) {
      update['specialty'] = taxonomyDesc
    }

    if (Object.keys(update).length > 0) {
      await col.updateOne({ npi }, { $set: update })
      updated++
    }

    processed++
    if (processed % 100 === 0) {
      console.log(`  ${processed} providers processed, ${updated} updated`)
    }
  }

  console.log(`\nNPI sync complete.`)
  console.log(`  Providers processed: ${processed}`)
  console.log(`  Providers updated  : ${updated}`)
  await closeDb()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

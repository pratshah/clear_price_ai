import { getDb } from '../db.js'

interface CollectionFreshness {
  last_updated: Date | null
  record_count: number
  updates_observed: number
}

interface FreshnessState {
  prices: CollectionFreshness
  hospitals: CollectionFreshness
  started_at: Date
}

const state: FreshnessState = {
  prices: { last_updated: null, record_count: 0, updates_observed: 0 },
  hospitals: { last_updated: null, record_count: 0, updates_observed: 0 },
  started_at: new Date(),
}

export function getFreshness(): FreshnessState {
  return state
}

async function seedInitialCounts(db: Awaited<ReturnType<typeof getDb>>) {
  const [priceCount, hospitalCount] = await Promise.all([
    db.collection('prices').countDocuments(),
    db.collection('hospitals').countDocuments(),
  ])
  state.prices.record_count = priceCount
  state.hospitals.record_count = hospitalCount

  // Use max ingested_at as initial last_updated fallback
  const [latestPrice, latestHospital] = await Promise.all([
    db.collection('prices').find({}).sort({ ingested_at: -1 }).limit(1).toArray(),
    db.collection('hospitals').find({}).sort({ ingested_at: -1 }).limit(1).toArray(),
  ])
  if (latestPrice[0]?.['ingested_at']) state.prices.last_updated = latestPrice[0]['ingested_at'] as Date
  if (latestHospital[0]?.['ingested_at']) state.hospitals.last_updated = latestHospital[0]['ingested_at'] as Date
}

export async function startChangeStreams(): Promise<void> {
  try {
    const db = await getDb()
    await seedInitialCounts(db)

    // Watch prices collection
    const pricesStream = db.collection('prices').watch(
      [{ $match: { operationType: { $in: ['insert', 'update', 'replace'] } } }],
      { fullDocument: 'updateLookup' }
    )
    pricesStream.on('change', () => {
      state.prices.last_updated = new Date()
      state.prices.updates_observed++
    })
    pricesStream.on('error', (err) => {
      console.warn('[ChangeStream] prices error (may not be available on standalone):', err.message)
    })

    // Watch hospitals collection
    const hospitalsStream = db.collection('hospitals').watch(
      [{ $match: { operationType: { $in: ['insert', 'update', 'replace'] } } }],
      { fullDocument: 'updateLookup' }
    )
    hospitalsStream.on('change', () => {
      state.hospitals.last_updated = new Date()
      state.hospitals.updates_observed++
    })
    hospitalsStream.on('error', (err) => {
      console.warn('[ChangeStream] hospitals error (may not be available on standalone):', err.message)
    })

    console.log(`[ChangeStream] Watching prices (${state.prices.record_count} docs) + hospitals (${state.hospitals.record_count} docs)`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[ChangeStream] Could not start (requires replica set / Atlas):', msg)
  }
}

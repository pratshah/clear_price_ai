import { z } from 'zod'
import { getDb } from '../db/client.js'

const inputSchema = z.object({
  npi: z.string().optional(),
  name: z.string().optional(),
  address: z.string().optional(),
})

async function lookupGooglePlaces(query: string): Promise<{ place_id: string; rating: number; review_count: number; url: string } | null> {
  const apiKey = process.env['GOOGLE_MAPS_API_KEY']
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,rating,user_ratings_total,url&key=${apiKey}`
  const res = await fetch(url)
  const data = await res.json() as any
  const candidate = data.candidates?.[0]
  if (!candidate) return null
  return {
    place_id: candidate.place_id,
    rating: candidate.rating,
    review_count: candidate.user_ratings_total,
    url: candidate.url ?? '',
  }
}

export const getProviderRatings = {
  schema: inputSchema.shape,
  handler: async ({ npi, name, address }: z.infer<typeof inputSchema>) => {
    const db = await getDb()

    const query: Record<string, unknown> = {}
    if (npi) query['npi'] = npi

    const provider = npi
      ? await db.collection('providers').findOne({ npi })
      : null

    // Return cached rating if fresh
    if (provider?.['google']?.['place_id']) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(provider['google']) }],
      }
    }

    // Fetch from Google Places and cache
    const searchQuery = name && address ? `${name} ${address}` : name ?? address
    if (!searchQuery) throw new Error('npi, name, or address is required')

    const googleData = await lookupGooglePlaces(searchQuery)
    if (!googleData) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ rating: null, review_count: null, note: 'Not found on Google Places' }) }],
      }
    }

    // Cache back to MongoDB
    if (npi) {
      await db.collection('providers').updateOne(
        { npi },
        { $set: { google: googleData } }
      )
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(googleData) }],
    }
  },
}

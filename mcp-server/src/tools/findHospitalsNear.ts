import { z } from 'zod'
import { getDb } from '../db/client.js'

const inputSchema = z.object({
  zip_code: z.string().optional(),
  address: z.string().optional(),
  radius_miles: z.number().default(25),
  filters: z.object({
    trauma_level: z.string().optional(),
    type: z.string().optional(),
    min_cms_stars: z.number().optional(),
  }).optional(),
})

async function geocode(query: string): Promise<[number, number]> {
  const apiKey = process.env['GOOGLE_MAPS_API_KEY']
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`
  const res = await fetch(url)
  const data = await res.json() as any
  const loc = data.results?.[0]?.geometry?.location
  if (!loc) throw new Error(`Could not geocode: ${query}`)
  return [loc.lng, loc.lat]
}

export const findHospitalsNear = {
  schema: inputSchema.shape,
  handler: async ({ zip_code, address, radius_miles, filters }: z.infer<typeof inputSchema>) => {

    const query = zip_code ?? address
    if (!query) throw new Error('zip_code or address is required')

    const coords = await geocode(query)
    const radiusMeters = radius_miles * 1609.34

    const db = await getDb()
    const matchStage: Record<string, unknown> = {
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: coords },
          $maxDistance: radiusMeters,
        },
      },
    }

    if (filters?.min_cms_stars) {
      matchStage['quality.cms_star_rating'] = { $gte: filters.min_cms_stars }
    }
    if (filters?.trauma_level) {
      matchStage['trauma_level'] = filters.trauma_level
    }
    if (filters?.type) {
      matchStage['type'] = filters.type
    }

    const hospitals = await db.collection('hospitals')
      .find(matchStage)
      .limit(10)
      .project({
        _id: 0, ccn: 1, name: 1, address: 1, location: 1,
        type: 1, trauma_level: 1,
        'quality.cms_star_rating': 1, 'quality.leapfrog_safety_grade': 1,
        'google.rating': 1, 'google.review_count': 1,
      })
      .toArray()

    // Add distance_miles to each result
    const results = hospitals.map((h) => {
      const [lng, lat] = (h['location'] as any).coordinates
      const distKm = Math.sqrt(
        Math.pow((lng - coords[0]) * 85, 2) + Math.pow((lat - coords[1]) * 111, 2)
      )
      return { ...h, distance_miles: Math.round(distKm * 0.621371 * 10) / 10 }
    })

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(results) }],
    }
  },
}

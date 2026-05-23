import { z } from 'zod'
import { getDb } from '../db/client.js'

const inputSchema = z.object({
  procedure_codes: z.array(z.string()).min(1),
  zip_code: z.string(),
  radius_miles: z.number().default(25),
})

async function geocode(zip: string): Promise<[number, number]> {
  const apiKey = process.env['GOOGLE_MAPS_API_KEY']
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zip)}&key=${apiKey}`
  const res = await fetch(url)
  const data = await res.json() as any
  const loc = data.results?.[0]?.geometry?.location
  if (!loc) throw new Error(`Could not geocode: ${zip}`)
  return [loc.lng, loc.lat]
}

export const getAscPrices = {
  schema: inputSchema.shape,
  handler: async ({ procedure_codes, zip_code, radius_miles }: z.infer<typeof inputSchema>) => {
    const db = await getDb()

    const coords = await geocode(zip_code)
    const radiusMeters = radius_miles * 1609.34

    const ascResults = await db.collection('asc_prices').aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: coords },
          distanceField: 'distance_meters',
          maxDistance: radiusMeters,
          query: { procedure_code: { $in: procedure_codes } },
          spherical: true,
        },
      },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          asc_ccn: 1, asc_name: 1,
          procedure_code: 1, plain_name: 1,
          avg_submitted_charges: 1, avg_medicare_allowed: 1,
          'google.rating': 1, 'google.review_count': 1,
          distance_miles: { $round: [{ $multiply: ['$distance_meters', 0.000621371] }, 1] },
        },
      },
    ]).toArray()

    // Fetch hospital outpatient price for same codes as comparison
    const hospitalPrices = await db.collection('prices').aggregate([
      {
        $match: {
          procedure_code: { $in: procedure_codes },
          procedure_code_type: 'APC',
        },
      },
      {
        $group: {
          _id: '$procedure_code',
          avg_hospital_payment: {
            $median: { input: '$avg_medicare_allowed', method: 'approximate' },
          },
        },
      },
    ]).toArray()

    const hospitalMap = Object.fromEntries(
      hospitalPrices.map((h) => [h['_id'], h['avg_hospital_payment']])
    )

    const enriched = ascResults.map((a) => {
      const hospitalAvg = hospitalMap[a['procedure_code'] as string] ?? null
      const ascPayment = a['avg_medicare_allowed'] as number
      return {
        ...a,
        avg_hospital_outpatient_payment: hospitalAvg,
        savings_amount: hospitalAvg ? Math.round(hospitalAvg - ascPayment) : null,
        savings_pct: hospitalAvg ? Math.round((1 - ascPayment / hospitalAvg) * 100) : null,
      }
    })

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(enriched) }],
    }
  },
}

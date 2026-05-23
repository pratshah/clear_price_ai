import { Hono } from 'hono'
import { z } from 'zod'
import { getDb } from '../db.js'

export const hospitalsRoute = new Hono()

const searchSchema = z.object({
  zip: z.string(),
  radius: z.coerce.number().default(25),
  procedure: z.string().optional(),
  min_stars: z.coerce.number().optional(),
})

hospitalsRoute.get('/search', async (c) => {
  const parsed = searchSchema.safeParse(c.req.query())
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400)
  }

  const { zip, radius, min_stars } = parsed.data
  const apiKey = process.env['GOOGLE_MAPS_API_KEY']

  try {
    // Geocode zip
    let coords: [number, number] | null = null
    if (apiKey) {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zip)}&key=${apiKey}`
      const geoRes = await fetch(geoUrl)
      const geoData = await geoRes.json() as { status: string; results: Array<{ geometry: { location: { lat: number; lng: number } } }> }
      if (geoData.status === 'OK' && geoData.results[0]) {
        const { lat, lng } = geoData.results[0].geometry.location
        coords = [lng, lat]
      }
    }

    const db = await getDb()
    const matchStage: Record<string, unknown> = {}

    if (coords) {
      matchStage['location'] = {
        $near: {
          $geometry: { type: 'Point', coordinates: coords },
          $maxDistance: radius * 1609.34,
        },
      }
    }

    if (min_stars) {
      matchStage['quality.cms_star_rating'] = { $gte: min_stars }
    }

    const hospitals = await db.collection('hospitals')
      .find(matchStage)
      .limit(20)
      .project({
        _id: 0, ccn: 1, name: 1, address: 1, location: 1, type: 1,
        'quality.cms_star_rating': 1, 'quality.leapfrog_safety_grade': 1,
        'google.rating': 1, 'google.review_count': 1,
      })
      .toArray()

    // Compute distance_miles if we have coords
    const results = hospitals.map((h) => {
      if (!coords) return { ...h, distance_miles: null }
      const [hLng, hLat] = (h['location'] as { coordinates: [number, number] }).coordinates
      const distKm = Math.sqrt(
        Math.pow((hLng - coords[0]) * 85, 2) +
        Math.pow((hLat - coords[1]) * 111, 2)
      )
      return { ...h, distance_miles: Math.round(distKm * 0.621371 * 10) / 10 }
    })

    return c.json({ hospitals: results })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: msg }, 500)
  }
})

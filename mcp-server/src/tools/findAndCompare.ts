import { z } from 'zod'
import { getDb } from '../db/client.js'
import { GoogleGenAI } from '@google/genai'

const ai = process.env['GEMINI_API_KEY'] ? new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY'] }) : null

const inputSchema = z.object({
  procedure_query: z.string().describe('Natural language procedure e.g. "knee replacement"'),
  location: z.string().describe('Zip code or city name e.g. "94102" or "Chicago"'),
  radius_miles: z.number().default(25),
  top_k_procedures: z.number().int().default(2),
})

async function geocode(query: string): Promise<[number, number]> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${process.env['GOOGLE_MAPS_API_KEY']}`
  const res = await fetch(url)
  const data = await res.json() as any
  const loc = data.results?.[0]?.geometry?.location
  if (!loc) throw new Error(`Could not geocode: ${query}`)
  return [loc.lng, loc.lat]
}

async function getEmbedding(query: string): Promise<number[] | null> {
  if (!ai) return null
  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: query,
      config: { outputDimensionality: 768 },
    })
    return response.embeddings?.[0]?.values ?? null
  } catch {
    return null
  }
}

function leapfrogScore(grade: string | undefined): number {
  return { A: 1, B: 0.75, C: 0.5, D: 0.25, F: 0 }[grade ?? ''] ?? 0.5
}

function normalize(values: number[]): number[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return values.map(() => 0.5)
  return values.map((v) => (v - min) / (max - min))
}

export const findAndCompare = {
  schema: inputSchema.shape,
  handler: async ({ procedure_query, location, radius_miles, top_k_procedures }: z.infer<typeof inputSchema>) => {
    const t0 = Date.now()
    const db = await getDb()
    console.error(`[findAndCompare] getDb: ${Date.now() - t0}ms`)

    // Phase 1: procedure lookup + geocode in parallel
    const t1 = Date.now()
    const [queryVector, coords] = await Promise.all([
      getEmbedding(procedure_query),
      geocode(location),
    ])
    console.error(`[findAndCompare] phase1 embed+geocode: ${Date.now() - t1}ms`)

    // Phase 2: procedure search + hospital geo search in parallel
    const procedureSearchPromise = (async () => {
      // Tier 1: vector search
      if (queryVector) {
        try {
          const res = await db.collection('procedures').aggregate([
            { $vectorSearch: { index: 'procedures_vector_index', path: 'embedding', queryVector, numCandidates: 50, limit: top_k_procedures } },
            { $project: { _id: 0, code: 1, code_type: 1, plain_name: 1, setting: 1 } },
          ]).toArray()
          if (res.length > 0) return res
        } catch {}
      }
      // Tier 2: full-text search
      try {
        const res = await db.collection('procedures').aggregate([
          { $search: { index: 'procedures_search', text: { query: procedure_query, path: ['description', 'plain_name', 'aliases'] } } },
          { $limit: top_k_procedures },
          { $project: { _id: 0, code: 1, code_type: 1, plain_name: 1, setting: 1 } },
        ]).toArray()
        if (res.length > 0) return res
      } catch {}
      // Tier 3: regex fallback
      const regex = new RegExp(procedure_query.split(/\s+/).join('|'), 'i')
      return db.collection('procedures').find({
        $or: [{ plain_name: regex }, { description: regex }, { aliases: regex }],
      }).limit(top_k_procedures).project({ _id: 0, code: 1, code_type: 1, plain_name: 1, setting: 1 }).toArray()
    })()

    const hospitalSearchPromise = db.collection('hospitals').find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: coords },
          $maxDistance: radius_miles * 1609.34,
        },
      },
    })
      .limit(10)
      .project({
        _id: 0, ccn: 1, name: 1, location: 1, nonprofit: 1,
        'quality.cms_star_rating': 1, 'quality.leapfrog_safety_grade': 1,
        'google.rating': 1, 'google.review_count': 1,
        'financials.charity_care_ratio': 1,
      })
      .toArray()

    const t2 = Date.now()
    const [procedures, hospitals] = await Promise.all([procedureSearchPromise, hospitalSearchPromise])
    console.error(`[findAndCompare] phase2 procedure+hospital search: ${Date.now() - t2}ms`)

    if (!procedures.length || !hospitals.length) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ procedures, hospitals, ranked: [] }) }],
      }
    }

    const ccns = hospitals.map((h: any) => h.ccn)
    const codes = procedures.map((p: any) => p.code)
    const codeType = procedures[0]?.code_type ?? 'DRG'

    // Phase 3: price data + national median in parallel
    const t3 = Date.now()
    const [prices, national] = await Promise.all([
      db.collection('prices').aggregate([
        { $match: { hospital_ccn: { $in: ccns }, procedure_code: { $in: codes }, procedure_code_type: codeType } },
        { $group: { _id: '$hospital_ccn', avg_medicare_payments: { $avg: '$avg_medicare_payments' }, avg_covered_charges: { $avg: '$avg_covered_charges' }, total_discharges: { $sum: '$total_discharges' } } },
      ]).toArray(),
      db.collection('prices').aggregate([
        { $match: { procedure_code: { $in: codes }, procedure_code_type: codeType } },
        { $group: { _id: null, national_median_payment: { $median: { input: '$avg_medicare_payments', method: 'approximate' } } } },
      ]).toArray(),
    ])

    console.error(`[findAndCompare] phase3 prices: ${Date.now() - t3}ms`)
    console.error(`[findAndCompare] total tool time: ${Date.now() - t0}ms`)
    const nationalMedian = national[0]?.national_median_payment ?? null
    const priceMap = Object.fromEntries(prices.map((p: any) => [p._id, p]))

    const merged = hospitals.map((h: any) => {
      const [lng, lat] = h.location.coordinates
      const distKm = Math.sqrt(Math.pow((lng - coords[0]) * 85, 2) + Math.pow((lat - coords[1]) * 111, 2))
      const distance_miles = Math.round(distKm * 0.621371 * 10) / 10
      const price = priceMap[h.ccn]
      const avgPayment = price?.avg_medicare_payments ?? null

      return {
        ccn: h.ccn,
        name: h.name,
        distance_miles,
        avg_medicare_payments: avgPayment ? Math.round(avgPayment) : null,
        avg_covered_charges: price?.avg_covered_charges ? Math.round(price.avg_covered_charges) : null,
        national_median_payment: nationalMedian ? Math.round(nationalMedian) : null,
        pct_vs_national: nationalMedian && avgPayment ? Math.round((avgPayment / nationalMedian - 1) * 100) : null,
        total_discharges: price?.total_discharges ?? null,
        cms_star_rating: h.quality?.cms_star_rating ?? null,
        leapfrog_safety_grade: h.quality?.leapfrog_safety_grade ?? null,
        google_rating: h.google?.rating ?? null,
        google_review_count: h.google?.review_count ?? null,
        charity_care_ratio: h.financials?.charity_care_ratio ?? null,
        has_financial_assistance: h.nonprofit === true || (h.financials?.charity_care_ratio > 0.01),
      }
    })

    const withPayment = merged.filter((h) => h.avg_medicare_payments !== null)
    const noPayment = merged.filter((h) => h.avg_medicare_payments === null)

    if (withPayment.length > 0) {
      const priceScores = normalize(withPayment.map((h) => -h.avg_medicare_payments!))
      const qualityScores = normalize(withPayment.map((h) => ((h.cms_star_rating ?? 3) / 5 + leapfrogScore(h.leapfrog_safety_grade)) / 2))
      const distanceScores = normalize(withPayment.map((h) => -(h.distance_miles ?? 999)))
      const ratingScores = normalize(withPayment.map((h) => h.google_rating ?? 3))

      withPayment.forEach((h, i) => {
        (h as any).composite_score = Math.round(
          ((priceScores[i] ?? 0) * 0.35 + (qualityScores[i] ?? 0) * 0.30 +
           (distanceScores[i] ?? 0) * 0.15 + (ratingScores[i] ?? 0) * 0.20) * 100
        ) / 100
      })
      withPayment.sort((a, b) => (b as any).composite_score - (a as any).composite_score)
    }

    const ranked = [
      ...withPayment.map((h, i) => ({ rank: i + 1, ...h })),
      ...noPayment.map((h) => ({ rank: null, ...h })),
    ]

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ procedures, ranked }) }],
    }
  },
}

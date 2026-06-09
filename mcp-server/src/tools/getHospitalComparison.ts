import { z } from 'zod'
import { getDb } from '../db/client.js'

const inputSchema = z.object({
  hospital_ccns: z.array(z.string()).min(1).max(20),
  procedure_codes: z.array(z.string()).min(1),
  code_type: z.enum(['DRG', 'APC']).default('DRG'),
  hospital_distances: z.record(z.string(), z.number()).optional(),
})

function leapfrogScore(grade: string | undefined): number {
  return { A: 1, B: 0.75, C: 0.5, D: 0.25, F: 0 }[grade ?? ''] ?? 0.5
}

function normalize(values: number[]): number[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return values.map(() => 0.5)
  return values.map((v) => (v - min) / (max - min))
}

export const getHospitalComparison = {
  schema: inputSchema.shape,
  handler: async ({ hospital_ccns, procedure_codes, code_type, hospital_distances }: z.infer<typeof inputSchema>) => {
    const db = await getDb()

    // Fan out all DB queries in parallel
    const [hospitals, prices, national] = await Promise.all([
      // Quality + financial in one query
      db.collection('hospitals')
        .find({ ccn: { $in: hospital_ccns } })
        .project({
          _id: 0, ccn: 1, name: 1, nonprofit: 1,
          'quality.cms_star_rating': 1,
          'quality.leapfrog_safety_grade': 1,
          'google.rating': 1,
          'google.review_count': 1,
          'financials.charity_care_ratio': 1,
        })
        .toArray(),

      // Per-hospital prices
      db.collection('prices').aggregate([
        {
          $match: {
            hospital_ccn: { $in: hospital_ccns },
            procedure_code: { $in: procedure_codes },
            procedure_code_type: code_type,
          },
        },
        {
          $group: {
            _id: '$hospital_ccn',
            plain_name: { $first: '$plain_name' },
            avg_medicare_payments: { $avg: '$avg_medicare_payments' },
            avg_covered_charges: { $avg: '$avg_covered_charges' },
            total_discharges: { $sum: '$total_discharges' },
          },
        },
      ]).toArray(),

      // National median benchmark
      db.collection('prices').aggregate([
        {
          $match: {
            procedure_code: { $in: procedure_codes },
            procedure_code_type: code_type,
          },
        },
        {
          $group: {
            _id: null,
            national_median_payment: {
              $median: { input: '$avg_medicare_payments', method: 'approximate' },
            },
          },
        },
      ]).toArray(),
    ])

    const nationalMedian = national[0]?.national_median_payment ?? null
    const priceMap = Object.fromEntries(prices.map((p) => [p['_id'], p]))

    // Merge all data per hospital
    const merged = hospitals.map((h) => {
      const price = priceMap[h['ccn'] as string]
      const distanceMiles = hospital_distances?.[h['ccn'] as string] ?? null
      const avgPayment = price?.avg_medicare_payments ?? null
      const pctVsNational = nationalMedian && avgPayment
        ? Math.round((avgPayment / nationalMedian - 1) * 100)
        : null

      return {
        ccn: h['ccn'],
        name: h['name'],
        distance_miles: distanceMiles,
        avg_medicare_payments: avgPayment ? Math.round(avgPayment) : null,
        avg_covered_charges: price?.avg_covered_charges ? Math.round(price.avg_covered_charges) : null,
        national_median_payment: nationalMedian ? Math.round(nationalMedian) : null,
        pct_vs_national: pctVsNational,
        total_discharges: price?.total_discharges ?? null,
        cms_star_rating: (h['quality'] as any)?.cms_star_rating ?? null,
        leapfrog_safety_grade: (h['quality'] as any)?.leapfrog_safety_grade ?? null,
        google_rating: (h['google'] as any)?.rating ?? null,
        google_review_count: (h['google'] as any)?.review_count ?? null,
        charity_care_ratio: (h['financials'] as any)?.charity_care_ratio ?? null,
        has_financial_assistance: h['nonprofit'] === true || ((h['financials'] as any)?.charity_care_ratio > 0.01),
      }
    })

    // Rank inline — no extra tool call needed
    const withPayment = merged.filter((h) => h.avg_medicare_payments !== null)
    const noPayment = merged.filter((h) => h.avg_medicare_payments === null)

    const priceScores = normalize(withPayment.map((h) => -(h.avg_medicare_payments!)))
    const qualityScores = normalize(withPayment.map((h) => {
      const stars = (h.cms_star_rating ?? 3) / 5
      return (stars + leapfrogScore(h.leapfrog_safety_grade)) / 2
    }))
    const distanceScores = normalize(withPayment.map((h) => -(h.distance_miles ?? 999)))
    const ratingScores = normalize(withPayment.map((h) => h.google_rating ?? 3))

    const ranked = withPayment.map((h, i) => ({
      ...h,
      composite_score: Math.round(
        ((priceScores[i] ?? 0) * 0.35 +
         (qualityScores[i] ?? 0) * 0.30 +
         (distanceScores[i] ?? 0) * 0.15 +
         (ratingScores[i] ?? 0) * 0.20) * 100
      ) / 100,
    }))

    ranked.sort((a, b) => b.composite_score - a.composite_score)
    const result = [
      ...ranked.map((h, i) => ({ rank: i + 1, ...h })),
      ...noPayment.map((h) => ({ rank: null, ...h, composite_score: null })),
    ]

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result) }],
    }
  },
}

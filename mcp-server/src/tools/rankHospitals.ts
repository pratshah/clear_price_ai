import { z } from 'zod'

const weightSchema = z.object({
  price: z.number().default(0.35),
  quality: z.number().default(0.30),
  distance: z.number().default(0.15),
  ratings: z.number().default(0.20),
})

const hospitalDataSchema = z.object({
  ccn: z.string(),
  name: z.string(),
  distance_miles: z.number().optional(),
  avg_medicare_payments: z.number().optional(),
  national_median_payment: z.number().optional(),
  cms_star_rating: z.number().optional(),
  leapfrog_safety_grade: z.string().optional(),
  google_rating: z.number().optional(),
  charity_care_ratio: z.number().optional(),
})

const inputSchema = z.object({
  hospitals: z.array(hospitalDataSchema).min(1),
  weights: weightSchema.optional(),
})

function normalize(values: number[]): number[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return values.map(() => 0.5)
  return values.map((v) => (v - min) / (max - min))
}

function leapfrogScore(grade: string | undefined): number {
  return { A: 1, B: 0.75, C: 0.5, D: 0.25, F: 0 }[grade ?? ''] ?? 0.5
}

export const rankHospitals = {
  schema: inputSchema.shape,
  handler: async ({ hospitals, weights }: z.infer<typeof inputSchema>) => {
    const w = weightSchema.parse(weights ?? {})

    const priceScores = normalize(
      hospitals.map((h) => -(h.avg_medicare_payments ?? Infinity))
    )
    const qualityScores = normalize(
      hospitals.map((h) => {
        const stars = (h.cms_star_rating ?? 3) / 5
        const leapfrog = leapfrogScore(h.leapfrog_safety_grade)
        return (stars + leapfrog) / 2
      })
    )
    const distanceScores = normalize(
      hospitals.map((h) => -(h.distance_miles ?? 999))
    )
    const ratingScores = normalize(
      hospitals.map((h) => h.google_rating ?? 3)
    )

    const ranked = hospitals.map((h, i) => {
      const composite =
        (priceScores[i] ?? 0) * w.price +
        (qualityScores[i] ?? 0) * w.quality +
        (distanceScores[i] ?? 0) * w.distance +
        (ratingScores[i] ?? 0) * w.ratings

      const pctVsNational = h.national_median_payment && h.avg_medicare_payments
        ? Math.round((h.avg_medicare_payments / h.national_median_payment - 1) * 100)
        : null

      return {
        ...h,
        composite_score: Math.round(composite * 100) / 100,
        price_score: Math.round((priceScores[i] ?? 0) * 100) / 100,
        quality_score: Math.round((qualityScores[i] ?? 0) * 100) / 100,
        distance_score: Math.round((distanceScores[i] ?? 0) * 100) / 100,
        ratings_score: Math.round((ratingScores[i] ?? 0) * 100) / 100,
        pct_vs_national: pctVsNational,
      }
    })

    ranked.sort((a, b) => b.composite_score - a.composite_score)
    const withRank = ranked.map((h, i) => ({ rank: i + 1, ...h }))

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(withRank) }],
    }
  },
}

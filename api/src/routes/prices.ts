import { Hono } from 'hono'
import { z } from 'zod'
import { getDb } from '../db.js'

export const pricesRoute = new Hono()

const compareSchema = z.object({
  hospital_ccns: z.string().transform((s) => s.split(',')),
  procedure_code: z.string(),
  code_type: z.enum(['DRG', 'APC']).default('DRG'),
})

pricesRoute.get('/compare', async (c) => {
  const parsed = compareSchema.safeParse(c.req.query())
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400)
  }

  const { hospital_ccns, procedure_code, code_type } = parsed.data

  try {
    const db = await getDb()

    // Per-hospital prices
    const prices = await db.collection('prices').aggregate([
      {
        $match: {
          hospital_ccn: { $in: hospital_ccns },
          procedure_code,
          procedure_code_type: code_type,
        },
      },
      {
        $group: {
          _id: '$hospital_ccn',
          plain_name: { $first: '$plain_name' },
          avg_covered_charges: { $avg: '$avg_covered_charges' },
          avg_medicare_payments: { $avg: '$avg_medicare_payments' },
          avg_total_payments: { $avg: '$avg_total_payments' },
          total_discharges: { $sum: '$total_discharges' },
          avg_medicare_allowed: { $avg: '$avg_medicare_allowed' },
          total_services: { $sum: '$total_services' },
        },
      },
      {
        $project: {
          _id: 0,
          ccn: '$_id',
          plain_name: 1,
          avg_covered_charges: { $round: ['$avg_covered_charges', 0] },
          avg_medicare_payments: { $round: ['$avg_medicare_payments', 0] },
          avg_total_payments: { $round: ['$avg_total_payments', 0] },
          total_discharges: 1,
          avg_medicare_allowed: { $round: ['$avg_medicare_allowed', 0] },
          total_services: 1,
        },
      },
    ]).toArray()

    // National median benchmark
    const national = await db.collection('prices').aggregate([
      { $match: { procedure_code, procedure_code_type: code_type } },
      {
        $group: {
          _id: null,
          national_median: {
            $median: { input: '$avg_medicare_payments', method: 'approximate' },
          },
          hospital_count: { $sum: 1 },
        },
      },
    ]).toArray()

    const nationalMedian = national[0]?.['national_median'] ?? null
    const hospitalCount = national[0]?.['hospital_count'] ?? 0

    // Join hospital names
    const hospitalDocs = await db.collection('hospitals')
      .find({ ccn: { $in: hospital_ccns } })
      .project({ _id: 0, ccn: 1, name: 1, 'quality.cms_star_rating': 1, 'google.rating': 1 })
      .toArray()
    const hospitalMap = Object.fromEntries(hospitalDocs.map((h) => [h['ccn'], h]))

    const enriched = prices.map((p) => {
      const hospital = hospitalMap[p['ccn'] as string] ?? {}
      const payment = (p['avg_medicare_payments'] as number) ?? (p['avg_medicare_allowed'] as number)
      return {
        ...p,
        hospital_name: (hospital as { name?: string })['name'] ?? 'Unknown',
        cms_star_rating: (hospital as { quality?: { cms_star_rating?: number } })['quality']?.['cms_star_rating'] ?? null,
        google_rating: (hospital as { google?: { rating?: number } })['google']?.['rating'] ?? null,
        national_median_payment: nationalMedian ? Math.round(nationalMedian) : null,
        pct_vs_national: nationalMedian && payment
          ? Math.round((payment / nationalMedian - 1) * 100)
          : null,
      }
    })

    return c.json({
      prices: enriched,
      procedure_code,
      code_type,
      national_median: nationalMedian ? Math.round(nationalMedian) : null,
      national_hospital_count: hospitalCount,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: msg }, 500)
  }
})

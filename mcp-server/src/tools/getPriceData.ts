import { z } from 'zod'
import { getDb } from '../db/client.js'

const inputSchema = z.object({
  hospital_ccns: z.array(z.string()).min(1).max(20),
  procedure_codes: z.array(z.string()).min(1),
  code_type: z.enum(['DRG', 'APC']).default('DRG'),
})

export const getPriceData = {
  schema: inputSchema.shape,
  handler: async ({ hospital_ccns, procedure_codes, code_type }: z.infer<typeof inputSchema>) => {
    const db = await getDb()

    // Per-hospital prices
    const prices = await db.collection('prices').aggregate([
      {
        $match: {
          hospital_ccn: { $in: hospital_ccns },
          procedure_code: { $in: procedure_codes },
          procedure_code_type: code_type,
        },
      },
      {
        $group: {
          _id: { ccn: '$hospital_ccn', code: '$procedure_code' },
          plain_name: { $first: '$plain_name' },
          avg_covered_charges: { $avg: '$avg_covered_charges' },
          avg_medicare_payments: { $avg: '$avg_medicare_payments' },
          avg_total_payments: { $avg: '$avg_total_payments' },
          total_discharges: { $sum: '$total_discharges' },
        },
      },
      {
        $project: {
          _id: 0,
          ccn: '$_id.ccn',
          procedure_code: '$_id.code',
          plain_name: 1,
          avg_covered_charges: { $round: ['$avg_covered_charges', 0] },
          avg_medicare_payments: { $round: ['$avg_medicare_payments', 0] },
          avg_total_payments: { $round: ['$avg_total_payments', 0] },
          total_discharges: 1,
        },
      },
    ]).toArray()

    // National median for benchmark
    const national = await db.collection('prices').aggregate([
      {
        $match: {
          procedure_code: { $in: procedure_codes },
          procedure_code_type: code_type,
        },
      },
      {
        $group: {
          _id: '$procedure_code',
          national_median_payment: {
            $median: { input: '$avg_medicare_payments', method: 'approximate' },
          },
          hospital_count: { $sum: 1 },
        },
      },
    ]).toArray()

    const nationalMap = Object.fromEntries(
      national.map((n) => [n['_id'], { median: n['national_median_payment'], count: n['hospital_count'] }])
    )

    const enriched = prices.map((p) => {
      const bench = nationalMap[p['procedure_code'] as string]
      return {
        ...p,
        national_median_payment: bench?.median ?? null,
        pct_vs_national: bench?.median
          ? Math.round(((p['avg_medicare_payments'] as number) / bench.median - 1) * 100)
          : null,
      }
    })

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(enriched) }],
    }
  },
}

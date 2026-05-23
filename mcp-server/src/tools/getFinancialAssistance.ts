import { z } from 'zod'
import { getDb } from '../db/client.js'

const inputSchema = z.object({
  hospital_ccns: z.array(z.string()).min(1).max(20),
})

export const getFinancialAssistance = {
  schema: inputSchema.shape,
  handler: async ({ hospital_ccns }: z.infer<typeof inputSchema>) => {
    const db = await getDb()

    const results = await db.collection('hospitals')
      .find({ ccn: { $in: hospital_ccns } })
      .project({
        _id: 0, ccn: 1, name: 1, nonprofit: 1,
        'financials.charity_care_cost': 1,
        'financials.charity_care_ratio': 1,
        'financials.uncompensated_care': 1,
        'financials.fiscal_year': 1,
      })
      .toArray()

    const enriched = results.map((h) => ({
      ...h,
      has_financial_assistance_program: (h['nonprofit'] === true) ||
        ((h['financials'] as any)?.charity_care_ratio > 0.01),
    }))

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(enriched) }],
    }
  },
}

import { z } from 'zod'
import { getDb } from '../db/client.js'

const inputSchema = z.object({
  hospital_ccn: z.string(),
  specialty: z.string().optional(),
  accepting_new_patients: z.boolean().optional(),
  limit: z.number().int().min(1).max(10).default(5),
})

export const getProviders = {
  schema: inputSchema.shape,
  handler: async ({ hospital_ccn, specialty, accepting_new_patients, limit }: z.infer<typeof inputSchema>) => {
    const db = await getDb()

    const matchStage: Record<string, unknown> = { hospital_ccn }
    if (accepting_new_patients !== undefined) {
      matchStage['accepting_new_patients'] = accepting_new_patients
    }

    const pipeline: object[] = []

    if (specialty) {
      // Atlas Full-Text search on specialty name
      pipeline.push({
        $search: {
          index: 'providers_search',
          text: { query: specialty, path: 'specialty' },
        },
      })
      pipeline.push({ $match: matchStage })
    } else {
      pipeline.push({ $match: matchStage })
    }

    pipeline.push(
      { $sort: { 'google.rating': -1, 'cms_quality.quality_score': -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0, npi: 1, name: 1, specialty: 1, phone: 1,
          accepting_new_patients: 1,
          'google.rating': 1, 'google.review_count': 1, 'google.url': 1,
          'cms_quality.quality_score': 1, 'cms_quality.medicare_patients': 1,
        },
      }
    )

    const results = await db.collection('providers').aggregate(pipeline).toArray()

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(results) }],
    }
  },
}

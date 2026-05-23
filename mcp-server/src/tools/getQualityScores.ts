import { z } from 'zod'
import { getDb } from '../db/client.js'

const inputSchema = z.object({
  hospital_ccns: z.array(z.string()).min(1).max(20),
})

export const getQualityScores = {
  schema: inputSchema.shape,
  handler: async ({ hospital_ccns }: z.infer<typeof inputSchema>) => {
    const db = await getDb()

    const results = await db.collection('hospitals')
      .find({ ccn: { $in: hospital_ccns } })
      .project({
        _id: 0, ccn: 1, name: 1,
        'quality.cms_star_rating': 1,
        'quality.leapfrog_safety_grade': 1,
        'quality.patient_experience': 1,
        'quality.readmission_rate': 1,
        'quality.mortality_rate': 1,
        'quality.hcahps_overall': 1,
        'google.rating': 1,
        'google.review_count': 1,
        'google.url': 1,
      })
      .toArray()

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(results) }],
    }
  },
}

import { z } from 'zod'
import { getDb } from '../db/client.js'

const saveSchema = z.object({
  ccn: z.string().describe('The CMS Certification Number (CCN) of the hospital to save'),
  name: z.string().describe('The name of the hospital'),
  cms_star_rating: z.number().optional().nullable().describe('The CMS star rating of the hospital (out of 5)'),
  google_rating: z.number().optional().nullable().describe('The Google Maps user rating (out of 5)'),
  state: z.string().optional().nullable().describe('The state code where the hospital is located (e.g. CA)'),
  address: z.string().optional().nullable().describe('The street address of the hospital'),
})

const removeSchema = z.object({
  ccn: z.string().describe('The CMS Certification Number (CCN) of the hospital to remove'),
})

export const saveToPortfolio = {
  schema: saveSchema.shape,
  handler: async ({ ccn, name, cms_star_rating, google_rating, state, address }: z.infer<typeof saveSchema>) => {
    const db = await getDb()
    const doc = {
      ccn,
      name,
      cms_star_rating: cms_star_rating ?? null,
      google_rating: google_rating ?? null,
      state: state ?? '',
      address: address ?? '',
      saved_at: new Date()
    }

    await db.collection('portfolio').updateOne(
      { ccn },
      { $set: doc },
      { upsert: true }
    )

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, saved: doc }) }],
    }
  },
}

export const getFromPortfolio = {
  schema: {},
  handler: async () => {
    const db = await getDb()
    const list = await db.collection('portfolio').find({}).toArray()
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ portfolio: list }) }],
    }
  },
}

export const removeFromPortfolio = {
  schema: removeSchema.shape,
  handler: async ({ ccn }: z.infer<typeof removeSchema>) => {
    const db = await getDb()
    const result = await db.collection('portfolio').deleteOne({ ccn })
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, deletedCount: result.deletedCount }) }],
    }
  },
}

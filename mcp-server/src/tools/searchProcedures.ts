import { z } from 'zod'
import { getDb } from '../db/client.js'

const inputSchema = z.object({
  query: z.string().describe('Natural language procedure description e.g. "knee replacement"'),
  top_k: z.number().int().min(1).max(10).default(5),
})

export const searchProcedures = {
  schema: inputSchema.shape,
  handler: async ({ query, top_k }: z.infer<typeof inputSchema>) => {
    const db = await getDb()

    // Try Atlas Full-Text Search first (Atlas M10+), fall back to regex for local dev
    let results: unknown[]
    try {
      results = await db.collection('procedures').aggregate([
        {
          $search: {
            index: 'procedures_search',
            text: { query, path: ['description', 'plain_name', 'aliases'] },
          },
        },
        { $limit: top_k },
        { $project: { _id: 0, code: 1, code_type: 1, plain_name: 1, description: 1, setting: 1, related_codes: 1, score: { $meta: 'searchScore' } } },
      ]).toArray()
    } catch {
      // Fallback: regex search (local MongoDB without Atlas Search index)
      const regex = new RegExp(query.split(/\s+/).join('|'), 'i')
      results = await db.collection('procedures').find({
        $or: [
          { plain_name: regex },
          { description: regex },
          { aliases: regex },
        ],
      })
        .limit(top_k)
        .project({ _id: 0, code: 1, code_type: 1, plain_name: 1, description: 1, setting: 1, related_codes: 1 })
        .toArray()
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(results) }],
    }
  },
}

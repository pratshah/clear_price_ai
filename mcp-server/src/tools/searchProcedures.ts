import { z } from 'zod'
import { getDb } from '../db/client.js'
import { GoogleGenAI } from '@google/genai'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../.env') })

const apiKey = process.env['GEMINI_API_KEY']
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null

async function getQueryEmbedding(query: string): Promise<number[] | null> {
  if (!ai) {
    console.warn('GoogleGenAI client not initialized (GEMINI_API_KEY missing)')
    return null
  }
  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: query,
      config: { outputDimensionality: 768 }
    })
    if (response.embeddings && response.embeddings[0] && response.embeddings[0].values) {
      return response.embeddings[0].values
    }
  } catch (err) {
    console.error('Failed to generate embedding via Google Gen AI:', err)
  }
  return null
}

const inputSchema = z.object({
  query: z.string().describe('Natural language procedure description e.g. "knee replacement"'),
  top_k: z.number().int().min(1).max(10).default(5),
})

export const searchProcedures = {
  schema: inputSchema.shape,
  handler: async ({ query, top_k }: z.infer<typeof inputSchema>) => {
    const db = await getDb()
    let results: unknown[] = []
    let vectorSearchSuccess = false

    // Try True Atlas Vector Search RAG first
    const queryVector = await getQueryEmbedding(query)
    if (queryVector) {
      try {
        results = await db.collection('procedures').aggregate([
          {
            $vectorSearch: {
              index: 'procedures_vector_index',
              path: 'embedding',
              queryVector: queryVector,
              numCandidates: 100,
              limit: top_k,
            },
          },
          {
            $project: {
              _id: 0,
              code: 1,
              code_type: 1,
              plain_name: 1,
              description: 1,
              setting: 1,
              related_codes: 1,
              score: { $meta: 'vectorSearchScore' },
            },
          },
        ]).toArray()
        
        vectorSearchSuccess = results.length > 0
        if (vectorSearchSuccess) {
          console.log(`Atlas Vector Search successfully retrieved ${results.length} matches for "${query}"`)
        }
      } catch (err) {
        console.warn('Atlas Vector Search index procedures_vector_index is not active/available. Falling back...', err)
      }
    }

    // Fallback Phase: If vector search was bypassed or returned zero results, use Atlas Full-Text or Regex
    if (!vectorSearchSuccess) {
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
        console.log(`Full-Text search fallback retrieved ${results.length} matches`)
      } catch (err) {
        console.warn('Full-Text search index error, falling back to regex...', err)
      }

      // If both vector search and Atlas Full-Text search returned 0 results, run the regex search fallback!
      if (results.length === 0) {
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
        console.log(`Regex search fallback retrieved ${results.length} matches`)
      }
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(results) }],
    }
  },
}



import { z } from 'zod'
import { getDb } from '../db/client.js'

const saveSchema = z.object({
  session_id: z.string(),
  user_id: z.string().optional(),
  context_update: z.object({
    zip_code: z.string().optional(),
    specialty: z.string().optional(),
    radius_miles: z.number().optional(),
    medicare_type: z.enum(['original', 'advantage', 'none']).optional(),
    medigap_plan: z.enum(['G', 'F', 'N', 'none']).optional(),
  }),
  message: z.object({
    role: z.enum(['user', 'assistant', 'tool']),
    content: z.string(),
    tool_name: z.string().optional(),
  }).optional(),
})

const getSchema = z.object({
  session_id: z.string(),
})

export const saveSession = {
  schema: saveSchema.shape,
  handler: async ({ session_id, user_id, context_update, message }: z.infer<typeof saveSchema>) => {
    const db = await getDb()

    const ttl = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    const updateOps: Record<string, unknown> = {
      $set: { last_active: new Date(), ttl, ...(user_id ? { user_id } : {}) },
      $setOnInsert: { session_id, created_at: new Date(), context: {} },
    }

    if (Object.keys(context_update).length > 0) {
      updateOps['$set'] = {
        ...(updateOps['$set'] as object),
        ...Object.fromEntries(
          Object.entries(context_update).map(([k, v]) => [`context.${k}`, v])
        ),
      }
    }

    if (message) {
      updateOps['$push'] = {
        messages: { ...message, timestamp: new Date() },
      }
    }

    await db.collection('sessions').updateOne(
      { session_id },
      updateOps,
      { upsert: true }
    )

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, session_id }) }],
    }
  },
}

export const getSession = {
  schema: getSchema.shape,
  handler: async ({ session_id }: z.infer<typeof getSchema>) => {
    const db = await getDb()

    const session = await db.collection('sessions').findOne(
      { session_id },
      { projection: { _id: 0, context: 1, messages: { $slice: -20 } } }
    )

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(session ?? { context: {}, messages: [] }) }],
    }
  },
}

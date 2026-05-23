import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { z } from 'zod'
import { getRunner, ensureSession } from '../agent-runner.js'

export const chatRoute = new Hono()

const bodySchema = z.object({
  session_id: z.string().uuid(),
  message: z.string().min(1).max(2000),
  user_id: z.string().optional(),
})

// Agents we track for the status panel in the UI
const TRACKED_AGENTS = new Set([
  'procedure_agent',
  'hospital_discovery_agent',
  'price_intel_agent',
  'quality_financial_agent',
  'provider_agent',
  'insurance_agent',
])

chatRoute.post('/', async (c) => {
  const body = await c.req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400)
  }

  const { session_id, message, user_id = 'anonymous' } = parsed.data

  return streamSSE(c, async (stream) => {
    try {
      await ensureSession(session_id, user_id)

      const runner = getRunner()
      const userMessage = { role: 'user' as const, parts: [{ text: message }] }

      const activeAgents = new Set<string>()
      let responseText = ''

      for await (const event of runner.runAsync({
        userId: user_id,
        sessionId: session_id,
        newMessage: userMessage,
      })) {
        const author: string = event.author ?? ''
        const parts = (event.content?.parts ?? []) as Array<{
          text?: string
          functionCall?: { name: string; args?: unknown }
          functionResponse?: unknown
        }>

        // Emit agent_status events for the UI status panel
        if (TRACKED_AGENTS.has(author)) {
          if (!activeAgents.has(author)) {
            activeAgents.add(author)
            await stream.writeSSE({
              event: 'agent_status',
              data: JSON.stringify({ agent: author, status: 'running' }),
            })
          }
        }

        for (const part of parts) {
          if (part.text) {
            if (author === 'clearprice_orchestrator' || !TRACKED_AGENTS.has(author)) {
              responseText += part.text
              await stream.writeSSE({
                event: 'message_chunk',
                data: JSON.stringify({ text: part.text }),
              })
            }
          }

          // Mark agent complete when it emits a function call result
          if (part.functionResponse && TRACKED_AGENTS.has(author)) {
            await stream.writeSSE({
              event: 'agent_status',
              data: JSON.stringify({ agent: author, status: 'complete' }),
            })
            activeAgents.delete(author)
          }
        }
      }

      // Mark any still-active agents as complete
      for (const agent of activeAgents) {
        await stream.writeSSE({
          event: 'agent_status',
          data: JSON.stringify({ agent, status: 'complete' }),
        })
      }

      // Send final message
      await stream.writeSSE({
        event: 'message',
        data: JSON.stringify({
          session_id,
          content: responseText,
        }),
      })

      await stream.writeSSE({ event: 'done', data: '{}' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ error: msg }),
      })
    }
  })
})

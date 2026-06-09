import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { z } from 'zod'
import { getRunner, ensureSession } from '../agent-runner.js'
import { runEvaluation } from '../services/evaluator.js'

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

  c.header('Content-Type', 'text/event-stream')
  c.header('Cache-Control', 'no-cache, no-transform')
  c.header('Connection', 'keep-alive')
  c.header('X-Accel-Buffering', 'no')
  c.header('Content-Encoding', 'none')

  return streamSSE(c, async (stream) => {
    try {
      const tStart = Date.now()
      await ensureSession(session_id, user_id)
      console.log(`[chat] ensureSession: ${Date.now() - tStart}ms`)

      const runner = getRunner()
      const userMessage = { role: 'user' as const, parts: [{ text: message }] }
      let firstEventAt: number | null = null

      const activeAgents = new Set<string>()
      let responseText = ''
      let isSuggestionsBlockStarted = false

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

        if (!firstEventAt) {
          firstEventAt = Date.now()
          console.log(`[chat] first ADK event: ${firstEventAt - tStart}ms`)
        }
        // Emit structured price data from find_and_compare so the right panel updates
        for (const part of parts) {
          if (part.functionResponse && (part.functionResponse as any).name === 'find_and_compare') {
            try {
              const raw = (part.functionResponse as any).response?.content?.[0]?.text
              if (raw) {
                const parsed = JSON.parse(raw)
                if (parsed.ranked?.length > 0 && parsed.procedures?.length > 0) {
                  await stream.writeSSE({
                    event: 'price_data',
                    data: JSON.stringify({
                      ranked: parsed.ranked,
                      procedures: parsed.procedures,
                    }),
                  })
                }
              }
            } catch {}
          }
        }
        console.log('[ADK Event]', JSON.stringify({ author, parts: parts.map(p => ({ ...p, text: p.text?.slice(0, 50) })) }))


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

        // Stream text only from the orchestrator — sub-agent text is internal JSON/data
        if (author !== 'clearprice_orchestrator') continue

        let chunkText = ''
        for (const part of parts) {
          if (part.text) chunkText += part.text
        }

        if (!chunkText) continue

        // Split chunkText into small slices to simulate real-time typing
        const SLICE_SIZE = 15 // chars per slice
        const SLICE_DELAY = 10 // ms between slices
        let offset = 0
        while (offset < chunkText.length) {
          const slice = chunkText.slice(offset, offset + SLICE_SIZE)
          offset += SLICE_SIZE

          responseText += slice

          const suggStartedBefore = isSuggestionsBlockStarted
          if (responseText.includes('[SUGGESTIONS]')) isSuggestionsBlockStarted = true

          if (!isSuggestionsBlockStarted) {
            await stream.writeSSE({ event: 'message_chunk', data: JSON.stringify({ text: slice }) })
          } else if (!suggStartedBefore) {
            const suggIndex = responseText.indexOf('[SUGGESTIONS]')
            const chunkStart = responseText.length - slice.length
            if (suggIndex > chunkStart) {
              const before = slice.substring(0, suggIndex - chunkStart)
              if (before) {
                await stream.writeSSE({ event: 'message_chunk', data: JSON.stringify({ text: before }) })
              }
            }
          }

          // Delay to simulate typing
          await new Promise((resolve) => setTimeout(resolve, SLICE_DELAY))
        }
      }

      // Mark any still-active agents as complete
      for (const agent of activeAgents) {
        await stream.writeSSE({
          event: 'agent_status',
          data: JSON.stringify({ agent, status: 'complete' }),
        })
      }

      // Extract and parse suggestions chips if available, then strip from user text
      let cleanResponseText = responseText
      let suggestionChips: string[] = []

      const suggestionsMatch = responseText.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/)
      if (suggestionsMatch) {
        const jsonContent = suggestionsMatch[1]?.trim()
        try {
          if (jsonContent) {
            const parsedJson = JSON.parse(jsonContent)
            if (parsedJson && Array.isArray(parsedJson.chips)) {
              suggestionChips = parsedJson.chips
            }
          }
        } catch (err) {
          console.warn('Failed to parse dynamic suggestion chips JSON:', err)
        }
        cleanResponseText = responseText.replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/, '').trim()
      }
      // Strip any partial/unclosed [SUGGESTIONS] block (model truncated the closing tag)
      cleanResponseText = cleanResponseText.replace(/\[SUGGESTIONS\][\s\S]*$/, '').trim()

      // Emit suggestion chips if found
      if (suggestionChips.length > 0) {
        await stream.writeSSE({
          event: 'suggestion_chips',
          data: JSON.stringify({ chips: suggestionChips }),
        })
      }

      // Send final message with clean text
      await stream.writeSSE({
        event: 'message',
        data: JSON.stringify({
          session_id,
          content: cleanResponseText,
        }),
      })

      await stream.writeSSE({ event: 'done', data: '{}' })

      // Trigger non-blocking, asynchronous LLM Judge & Safety Evaluation logged to MongoDB Atlas
      await runEvaluation(session_id, message, cleanResponseText)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ error: msg }),
      })
    }
  })
})



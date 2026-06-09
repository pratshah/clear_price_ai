import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

import { InMemoryRunner, StreamingMode } from '@google/adk'
import { orchestrator } from '../agents/src/orchestrator.js'

async function run() {
  console.log('Running streaming debug script...')
  const runner = new InMemoryRunner({
    agent: orchestrator,
    appName: 'clearprice',
  })

  await runner.sessionService.createSession({
    appName: 'clearprice',
    userId: 'debug-user',
    sessionId: 'debug-session',
  })

  const userMessage = { role: 'user' as const, parts: [{ text: 'Knee replacement near 94102' }] }

  for await (const event of runner.runAsync({
    userId: 'debug-user',
    sessionId: 'debug-session',
    newMessage: userMessage,
    runConfig: {
      streamingMode: StreamingMode.SSE,
    },
  })) {
    console.log('--- EVENT START ---')
    console.log(`Author: ${event.author}`)
    console.log(`Partial: ${(event as any).partial}`)
    console.log('Content Parts:', JSON.stringify(event.content?.parts, null, 2))
    console.log('--- EVENT END ---\n')
  }
}

run().catch(console.error)

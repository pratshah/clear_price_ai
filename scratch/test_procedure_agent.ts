import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

import { InMemoryRunner, StreamingMode } from '@google/adk'
import { procedureAgent } from '../agents/src/procedure-agent.js'

async function run() {
  console.log('Running isolated procedure_agent test...')
  const runner = new InMemoryRunner({
    agent: procedureAgent,
    appName: 'clearprice',
  })

  await runner.sessionService.createSession({
    appName: 'clearprice',
    userId: 'debug-user',
    sessionId: 'procedure-session',
  })

  const userMessage = { role: 'user' as const, parts: [{ text: 'knee replacement' }] }

  for await (const event of runner.runAsync({
    userId: 'debug-user',
    sessionId: 'procedure-session',
    newMessage: userMessage,
    runConfig: {
      streamingMode: StreamingMode.SSE,
    },
  })) {
    console.log('--- EVENT START ---')
    console.log(`Author: ${event.author}`)
    console.log(`Partial: ${(event as any).partial}`)
    console.log(`turnComplete: ${(event as any).turnComplete}`)
    console.log('Content Parts:', JSON.stringify(event.content?.parts, null, 2))
    console.log('--- EVENT END ---\n')
  }
}

run().catch(console.error)

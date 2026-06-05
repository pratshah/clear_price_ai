import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env') })

import { InMemoryRunner, StreamingMode } from '@google/adk'
import { orchestrator } from '@clearprice/agents'

const SESSION_ID = 'test-session-stream-1'
const USER_ID = 'test-user'
const query = 'Hello, who are you? Just answer in one sentence.'

async function run() {
  console.log(`Testing InMemoryRunner runAsync with StreamingMode.SSE...`)
  
  const runner = new InMemoryRunner({
    agent: orchestrator,
    appName: 'clearprice',
  })

  await runner.sessionService.createSession({
    appName: 'clearprice',
    userId: USER_ID,
    sessionId: SESSION_ID,
  })

  const userMessage = { role: 'user' as const, parts: [{ text: query }] }

  let chunkCount = 0
  let totalParts = 0

  for await (const event of runner.runAsync({
    userId: USER_ID,
    sessionId: SESSION_ID,
    newMessage: userMessage,
    runConfig: {
      streamingMode: StreamingMode.SSE,
    }
  })) {
    console.log(`[Event] Author: ${event.author}, Type: ${(event as any).type || 'unknown'}, Keys: ${Object.keys(event).join(', ')}`)
    if (event.content) {
      console.log(`  -> Content keys: ${Object.keys(event.content).join(', ')}`)
      if (event.content.parts) {
        console.log(`  -> Parts count: ${event.content.parts.length}`)
        for (const part of event.content.parts as any[]) {
          totalParts++
          console.log(`    -> Part keys: ${Object.keys(part).join(', ')}, content: ${JSON.stringify(part)}`)
          if (part.text) {
            chunkCount++
            console.log(`      * Text Chunk: ${JSON.stringify(part.text)}`)
          } else if (part.functionCall) {
            console.log(`      * Tool Call: ${part.functionCall.name}`)
          } else if (part.functionResponse) {
            console.log(`      * Tool Response: ${part.functionResponse.name}`)
          }
        }
      } else {
        console.log(`  -> Content exists but has no parts:`, JSON.stringify(event.content))
      }
    } else {
      console.log(`  -> Event (No Content):`, JSON.stringify(event))
    }
  }

  console.log(`\nFinished test! Received ${chunkCount} text chunks and ${totalParts} total parts.`)
  process.exit(0)
}

run().catch((err) => {
  console.error('Error during streaming test:', err)
  process.exit(1)
})

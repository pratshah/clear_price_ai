import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env') })

import { InMemoryRunner } from '@google/adk'
import { orchestrator } from './orchestrator.js'

const SESSION_ID = 'test-session-multi'
const USER_ID = 'test-user'

const turns = [
  "hip replacement - zip 60134",
  "medicare",
  "no"
]

async function run() {
  console.log(`\nClearPrice Multi-Turn Conversation Simulator`)
  console.log('─'.repeat(60))

  const runner = new InMemoryRunner({
    agent: orchestrator,
    appName: 'clearprice',
  })

  // Create or retrieve session
  await runner.sessionService.createSession({
    appName: 'clearprice',
    userId: USER_ID,
    sessionId: SESSION_ID,
  })

  for (let i = 0; i < turns.length; i++) {
    const turnInput = turns[i] as string
    console.log(`\n[User Turn ${i + 1}]: "${turnInput}"\n`)
    
    const userMessage = { role: 'user' as const, parts: [{ text: turnInput }] }

    for await (const event of runner.runAsync({
      userId: USER_ID,
      sessionId: SESSION_ID,
      newMessage: userMessage,
    })) {
      const author: string = event.author ?? ''
      const parts = (event.content?.parts ?? []) as Array<{ text?: string; functionCall?: any; functionResponse?: any }>

      if (author && author !== 'clearprice_orchestrator' && author !== 'user') {
        process.stdout.write(`\n[→ Agent: ${author}]\n`)
      }

      for (const part of parts) {
        if (part.text) {
          process.stdout.write(part.text)
        } else if (part.functionCall) {
          console.log(`\n  [tool call: ${part.functionCall.name} with args: ${JSON.stringify(part.functionCall.args)}]`)
        } else if (part.functionResponse) {
          console.log(`\n  [tool response: ${part.functionResponse.name} payload size: ${JSON.stringify(part.functionResponse.response).length} chars]`)
        }
      }
    }
    console.log('\n' + '─'.repeat(40))
  }

  process.exit(0)
}

run().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})

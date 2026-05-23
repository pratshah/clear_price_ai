/**
 * Local test runner for the ClearPrice agent system.
 * Usage: npx tsx src/test-runner.ts
 *        npx tsx src/test-runner.ts "knee replacement near zip 35801"
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env') })

import { InMemoryRunner, InMemorySessionService } from '@google/adk'
import { orchestrator } from './orchestrator.js'

const SESSION_ID = 'test-session-1'
const USER_ID = 'test-user'

const query = process.argv[2] ?? 'What will a knee replacement cost near zip 35801?'

async function run() {
  console.log(`\nClearPrice Agent Test Runner`)
  console.log(`Query: "${query}"\n`)
  console.log('─'.repeat(60))

  const runner = new InMemoryRunner({
    agent: orchestrator,
    appName: 'clearprice',
  })

  const session = await runner.sessionService.createSession({
    appName: 'clearprice',
    userId: USER_ID,
    sessionId: SESSION_ID,
  })

  const userMessage = { role: 'user' as const, parts: [{ text: query }] }

  console.log('Streaming agent response...\n')

  for await (const event of runner.runAsync({
    userId: USER_ID,
    sessionId: SESSION_ID,
    newMessage: userMessage,
  })) {
    const author: string = event.author ?? ''
    const parts = (event.content?.parts ?? []) as Array<{ text?: string; functionCall?: unknown; functionResponse?: unknown }>

    // Show sub-agent transitions
    if (author && author !== 'clearprice_orchestrator' && author !== 'user') {
      process.stderr.write(`\n[→ ${author}]\n`)
    }

    for (const part of parts) {
      if (part.text) {
        process.stdout.write(part.text)
      } else if (part.functionCall) {
        const fc = part.functionCall as { name: string; args?: unknown }
        process.stderr.write(`  [tool call: ${fc.name}]\n`)
      }
    }
  }

  console.log('\n' + '─'.repeat(60))
  process.exit(0)
}

const isMain = process.argv[1] && (process.argv[1].endsWith('test-runner.ts') || process.argv[1].endsWith('test-runner.js') || process.argv[1].endsWith('test-runner'));
if (isMain) {
  run().catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
  })
}

import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

import app from '../api/src/index.js'

async function run() {
  console.log(`Sending POST request to /api/chat...`)

  const payload = {
    session_id: '3f0980bd-ca7a-429a-ae57-a9796070624e',
    message: 'Translate knee replacement to medical codes',
  }

  const res = await app.request('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  console.log(`HTTP Status: ${res.status}`)
  if (res.status !== 200) {
    const text = await res.text()
    console.error(`Error response: ${text}`)
    process.exit(1)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  let eventCount = 0
  let chunkTextReceived = ''

  console.log(`\n--- Starting SSE Stream ---\n`)

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (let line of lines) {
      line = line.trim()
      if (!line) continue

      eventCount++
      console.log(`[Line] ${line}`)

      if (line.startsWith('data: ')) {
        const dataStr = line.substring(6).trim()
        try {
          const parsed = JSON.parse(dataStr)
          if (parsed.text) {
            chunkTextReceived += parsed.text
          }
        } catch {}
      }
    }
  }

  console.log(`\n--- Finished SSE Stream ---\n`)
  console.log(`Total SSE Lines: ${eventCount}`)
  console.log(`Combined Received Text:\n\n${chunkTextReceived}\n`)

  process.exit(0)
}

run().catch((err) => {
  console.error('Fatal error during chat route test:', err)
  process.exit(1)
})

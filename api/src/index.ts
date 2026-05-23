import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') })

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { chatRoute } from './routes/chat.js'
import { hospitalsRoute } from './routes/hospitals.js'
import { pricesRoute } from './routes/prices.js'
import { metaRoute } from './routes/meta.js'
import { startChangeStreams } from './lib/changeStreams.js'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({ origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? '*' }))

app.get('/health', (c) => c.json({ ok: true }))
app.route('/api/chat', chatRoute)
app.route('/api/hospitals', hospitalsRoute)
app.route('/api/prices', pricesRoute)
app.route('/api/meta', metaRoute)

const port = Number(process.env['PORT'] ?? 8080)
console.log(`API listening on port ${port}`)
serve({ fetch: app.fetch, port })

// Start Change Streams after server is up (non-blocking)
startChangeStreams().catch(() => {})

export default app

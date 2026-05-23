import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env') })

import { InMemoryRunner } from '@google/adk'
import { orchestrator } from './orchestrator.js'

export const runner = new InMemoryRunner({
  agent: orchestrator,
  appName: 'clearprice',
})

export const sessionService = runner.sessionService

/**
 * ClearPrice Agent System — ADK entrypoint
 *
 * Local dev:  cd agents && npx adk web   (opens ADK dev UI at localhost:8000)
 * CLI test:   cd agents && npx adk run
 * Deploy:     cd agents && npx adk deploy --project $GCP_PROJECT_ID --location us-central1
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env') })

export { orchestrator } from './orchestrator.js'
export { runner, sessionService } from './runner.js'

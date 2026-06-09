/**
 * Singleton ADK runner for the API.
 * Re-uses one InMemoryRunner instance across requests.
 */
import { InMemoryRunner } from '@google/adk'
import { orchestrator, ORCHESTRATOR_PROMPT_VERSION } from '@clearprice/agents'
import { getDb } from './db.js'

let _runner: InMemoryRunner | null = null
let _promptLoaded = false

export function getRunner(): InMemoryRunner {
  if (!_runner) {
    _runner = new InMemoryRunner({ agent: orchestrator, appName: 'clearprice' })
  }
  return _runner
}

export async function ensureSession(sessionId: string, userId = 'anonymous'): Promise<void> {
  // Hot-reload system instructions from MongoDB Prompt Registry (LLMOps) — once per process lifetime
  if (!_promptLoaded) {
    _promptLoaded = true
    try {
      const db = await getDb()
      const promptDoc = await db.collection('prompts').findOne({ name: 'clearprice_orchestrator' })
      const dbVersion = promptDoc?.version ?? '0.0.0'
      const needsMigration = dbVersion < ORCHESTRATOR_PROMPT_VERSION

      if (promptDoc && typeof promptDoc.prompt === 'string' && !needsMigration) {
        orchestrator.instruction = promptDoc.prompt
        console.log(`LLMOps: Hot-reloaded prompt v${dbVersion}`)
      } else {
        await db.collection('prompts').updateOne(
          { name: 'clearprice_orchestrator' },
          { $set: { name: 'clearprice_orchestrator', prompt: orchestrator.instruction, updatedAt: new Date(), version: ORCHESTRATOR_PROMPT_VERSION, description: 'Dynamic system prompt for the ClearPrice main orchestrator agent.' } },
          { upsert: true }
        )
        console.log(`LLMOps: Migrated prompt to v${ORCHESTRATOR_PROMPT_VERSION}`)
      }
    } catch (err) {
      console.warn('LLMOps: Failed to fetch/seed prompt from DB. Using local instructions.', err)
    }
  }

  const runner = getRunner()
  const existing = await runner.sessionService.getSession({
    appName: 'clearprice',
    userId,
    sessionId,
  })
  if (!existing) {
    await runner.sessionService.createSession({
      appName: 'clearprice',
      userId,
      sessionId,
    })
  }
}


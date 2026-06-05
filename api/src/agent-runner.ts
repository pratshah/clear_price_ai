/**
 * Singleton ADK runner for the API.
 * Re-uses one InMemoryRunner instance across requests.
 */
import { InMemoryRunner } from '@google/adk'
import { orchestrator, ORCHESTRATOR_PROMPT_VERSION } from '@clearprice/agents'
import { getDb } from './db.js'

let _runner: InMemoryRunner | null = null

export function getRunner(): InMemoryRunner {
  if (!_runner) {
    _runner = new InMemoryRunner({ agent: orchestrator, appName: 'clearprice' })
  }
  return _runner
}

export async function ensureSession(sessionId: string, userId = 'anonymous'): Promise<void> {
  // Hot-reload system instructions from MongoDB Prompt Registry (LLMOps)
  try {
    const db = await getDb()
    const promptDoc = await db.collection('prompts').findOne({ name: 'clearprice_orchestrator' })
    
    // Check if we need to migrate/update the DB prompt
    const dbVersion = promptDoc?.version ?? '0.0.0'
    const needsMigration = dbVersion < ORCHESTRATOR_PROMPT_VERSION

    if (promptDoc && typeof promptDoc.prompt === 'string' && !needsMigration) {
      orchestrator.instruction = promptDoc.prompt
      console.log(`LLMOps Prompt Registry: Hot-reloaded "clearprice_orchestrator" prompt from MongoDB Atlas (Version: ${dbVersion}).`)
    } else {
      // Upsert/Migrate current prompt into MongoDB
      await db.collection('prompts').updateOne(
        { name: 'clearprice_orchestrator' },
        { 
          $set: { 
            name: 'clearprice_orchestrator',
            prompt: orchestrator.instruction, 
            updatedAt: new Date(), 
            version: ORCHESTRATOR_PROMPT_VERSION,
            description: 'Dynamic system prompt for the ClearPrice main orchestrator agent.'
          } 
        },
        { upsert: true }
      )
      console.log(`LLMOps Prompt Registry: Seeded/Migrated "clearprice_orchestrator" prompt in MongoDB Atlas to version ${ORCHESTRATOR_PROMPT_VERSION}.`)
    }
  } catch (err) {
    console.warn('LLMOps Prompt Registry: Failed to fetch/seed prompt from DB. Falling back to local instructions.', err)
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


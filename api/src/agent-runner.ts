/**
 * Singleton ADK runner for the API.
 * Re-uses one InMemoryRunner instance across requests.
 */
import { InMemoryRunner } from '@google/adk'
import { orchestrator } from '@clearprice/agents'

let _runner: InMemoryRunner | null = null

export function getRunner(): InMemoryRunner {
  if (!_runner) {
    _runner = new InMemoryRunner({ agent: orchestrator, appName: 'clearprice' })
  }
  return _runner
}

export async function ensureSession(sessionId: string, userId = 'anonymous'): Promise<void> {
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

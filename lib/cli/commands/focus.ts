/**
 * dust focus - Declare current objective for remote tracking
 *
 * When running in `dust loop`, this emits an event for remote interfaces
 * to track progress with meaningful session names.
 *
 * Usage: dust focus "add login box"
 */

import type { CommandDependencies, CommandResult } from '../types'

export interface FocusOptions {
  postEvent?: (url: string, payload: unknown) => Promise<void>
}

/* v8 ignore start - thin wrapper around fetch, tested via integration */
async function defaultPostEvent(url: string, payload: unknown): Promise<void> {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
/* v8 ignore stop */

export async function focus(
  dependencies: CommandDependencies,
  options: FocusOptions = {}
): Promise<CommandResult> {
  const { context } = dependencies
  const postEvent = options.postEvent ?? defaultPostEvent

  // Parse objective from arguments
  const objective = dependencies.arguments.join(' ').trim()

  if (!objective) {
    context.stderr('Error: No objective provided')
    context.stderr('Usage: dust focus "your objective here"')
    return { exitCode: 1 }
  }

  // Read session context from environment variables
  const sessionId = process.env.DUST_SESSION_ID
  const agentSessionId = process.env.DUST_AGENT_SESSION_ID
  const eventsUrl = process.env.DUST_EVENTS_URL

  // Output confirmation
  context.stdout(`🎯 Focus: ${objective}`)

  // Check if we're in a loop session
  if (!eventsUrl || !sessionId || !agentSessionId) {
    context.stdout('(Note: Not in a loop session, no event posted)')
    return { exitCode: 0 }
  }

  // Build and post the event
  const payload = {
    sequence: 0, // The receiver should track its own sequence or this should be managed differently
    timestamp: new Date().toISOString(),
    sessionId,
    agentSessionId,
    agentType: 'claude',
    event: {
      type: 'agent.focus',
      objective,
    },
  }

  try {
    await postEvent(eventsUrl, payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    context.stderr(`Warning: Failed to post focus event: ${message}`)
  }

  return { exitCode: 0 }
}

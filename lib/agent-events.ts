/**
 * Shared agent event types for the dust event protocol.
 *
 * These types define the transport-agnostic event format used by both
 * the HTTP (loop) and WebSocket (bucket) paths.
 */

import type { CommandEvent } from './command-events'

// Agent session event types sent over the wire
export type AgentSessionEvent =
  | {
      type: 'agent-session-started'
      title: string
      prompt: string
      agentType: string
      purpose: string
      machineName: string
      cwd: string
      platform: string
      dustVersion: string
      runtimeVersion: string
    }
  | { type: 'agent-session-ended'; success: boolean; error?: string }
  | { type: 'agent-session-activity' }
  | { type: 'agent-event'; provider: string; rawEvent: Record<string, unknown> }
  | { type: 'command-event'; commandEvent: CommandEvent }
  | { type: 'preflight-started'; step: string; title?: string }
  | { type: 'preflight-completed'; step: string; output?: string }
  | { type: 'preflight-failed'; step: string; output: string; title?: string }

// Unified wire format for both HTTP and WebSocket paths
export interface EventMessage {
  sequence: number
  timestamp: string
  sessionId: string
  repository: string
  // TODO: Make repoId required once dustbucket exposes an endpoint for
  // dust to resolve a GitHub URL / owner+repo pair to a stable repoId.
  // At that point we can stop sending `repository` (full name) entirely.
  repoId?: number
  agentSessionId?: string
  traceId?: string
  event: AgentSessionEvent
}

/**
 * Convert a raw agent streaming event to an AgentSessionEvent.
 * stream_event types become activity heartbeats; everything else
 * is forwarded as an agent-event with provider info.
 */
export function rawEventToAgentEvent(
  rawEvent: Record<string, unknown>,
  provider: string
): AgentSessionEvent {
  if (typeof rawEvent.type === 'string' && rawEvent.type === 'stream_event') {
    return { type: 'agent-session-activity' }
  }
  return { type: 'agent-event', provider, rawEvent }
}

const DEFAULT_HEARTBEAT_INTERVAL_MS = 5000

/**
 * Create a heartbeat throttler that limits agent-session-activity events
 * to at most once per interval (default: 5 seconds).
 *
 * The returned callback converts raw agent events to AgentSessionEvents,
 * throttling stream_event heartbeats while forwarding all other events.
 */
export function createHeartbeatThrottler(
  onAgentEvent: (event: AgentSessionEvent) => void,
  provider: string,
  options?: { intervalMs?: number; now?: () => number }
): (rawEvent: Record<string, unknown>) => void {
  const intervalMs = options?.intervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS
  const now = options?.now ?? Date.now
  let lastHeartbeatTime: number | undefined

  return (rawEvent: Record<string, unknown>) => {
    const event = rawEventToAgentEvent(rawEvent, provider)

    if (event.type === 'agent-session-activity') {
      const currentTime = now()
      if (
        lastHeartbeatTime !== undefined &&
        currentTime - lastHeartbeatTime < intervalMs
      ) {
        return // Throttle: skip this heartbeat
      }
      lastHeartbeatTime = currentTime
    }

    onAgentEvent(event)
  }
}

/**
 * Format an AgentSessionEvent for console output.
 * Returns null for events that should not be displayed.
 */
function agentDisplayName(agentType?: string): string {
  if (agentType === 'codex') return 'Codex'
  return 'Claude'
}

export function formatAgentEvent(event: AgentSessionEvent): string | null {
  switch (event.type) {
    case 'agent-session-started': {
      const name = agentDisplayName(event.agentType)
      return `🤖 Starting ${name}: ${event.title}`
    }
    case 'agent-session-ended':
      return event.success
        ? '🤖 Agent session ended (success)'
        : `🤖 Agent session ended (error: ${event.error})`
    case 'agent-session-activity':
    case 'agent-event':
    case 'command-event':
      return null
    case 'preflight-started':
      return `⚙ Pre-flight: ${event.step}`
    case 'preflight-completed':
      return `⚙ Pre-flight ${event.step} passed`
    case 'preflight-failed':
      return `⚙ Pre-flight failed: ${event.step}`
  }
}

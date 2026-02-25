/**
 * Shared agent event types for the dust event protocol.
 *
 * These types define the transport-agnostic event format used by both
 * the HTTP (loop) and WebSocket (bucket) paths.
 */

// The 4 agent session event types sent over the wire
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
  | { type: 'claude-event'; rawEvent: Record<string, unknown> }

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
  event: AgentSessionEvent
}

/**
 * Convert a raw Claude streaming event to an AgentSessionEvent.
 * stream_event types become activity heartbeats; everything else
 * is forwarded as a claude-event.
 */
export function rawEventToAgentEvent(
  rawEvent: Record<string, unknown>
): AgentSessionEvent {
  if (typeof rawEvent.type === 'string' && rawEvent.type === 'stream_event') {
    return { type: 'agent-session-activity' }
  }
  return { type: 'claude-event', rawEvent }
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
    case 'claude-event':
      return null
  }
}

/**
 * Shared agent event types for the dust event protocol.
 *
 * These types define the transport-agnostic event format used by both
 * the HTTP (loop) and WebSocket (bucket) paths. Local-only events
 * (loop.* and bucket.*) are not sent over the wire.
 */

import type { DustWireEvent } from './cli/commands/loop'

// The 4 agent session event types sent over the wire
export type AgentSessionEvent =
  | { type: 'agent-session-started' }
  | { type: 'agent-session-ended'; success: boolean; error?: string }
  | { type: 'agent-session-activity' }
  | { type: 'claude-event'; rawEvent: Record<string, unknown> }

// Unified wire format for both HTTP and WebSocket paths
export interface EventMessage {
  sequence: number
  timestamp: string
  sessionId: string
  repository: string
  agentSessionId?: string
  event: AgentSessionEvent
}

/**
 * Map a DustWireEvent to an AgentSessionEvent for wire transmission.
 * Returns null for events that should not be sent (loop.* events).
 */
export function mapToAgentEvent(
  event: DustWireEvent
): AgentSessionEvent | null {
  switch (event.type) {
    case 'claude.started':
      return { type: 'agent-session-started' }
    case 'claude.ended':
      return {
        type: 'agent-session-ended',
        success: event.success,
        error: event.error,
      }
    case 'claude.raw_event':
      if (
        typeof event.rawEvent.type === 'string' &&
        event.rawEvent.type === 'stream_event'
      ) {
        return { type: 'agent-session-activity' }
      }
      return { type: 'claude-event', rawEvent: event.rawEvent }
    default:
      // loop.* events are local-only, not sent over the wire
      return null
  }
}

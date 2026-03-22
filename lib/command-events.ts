/**
 * Command event types for the dust back channel protocol.
 *
 * These types define structured events emitted by dust commands.
 * Events are transported via DUST_PROXY_PORT (HTTP POST /events),
 * using the same envelope.
 */

/**
 * Events emitted by dust commands.
 */
export type CommandEvent =
  | { type: 'check-started'; name: string }
  | { type: 'check-passed'; name: string; durationMs: number }
  | { type: 'check-failed'; name: string; durationMs: number; output?: string }
  | { type: 'facts-listed'; facts: Array<{ path: string; title: string }> }
  | {
      type: 'ideas-listed'
      ideas: Array<{ path: string; title: string; status: string }>
    }
  | {
      type: 'principles-listed'
      principles: Array<{ path: string; title: string }>
    }
  | {
      type: 'tasks-listed'
      tasks: Array<{ path: string; title: string; blockedBy: string[] }>
    }

/**
 * Wire format for command events, following the same pattern as EventMessage.
 */
export interface CommandEventMessage {
  sequence: number
  timestamp: string
  traceId?: string
  event: CommandEvent
}

/**
 * Creates an event emitter function that writes command events to a callback.
 * Each event is wrapped in a CommandEventMessage envelope with sequence and timestamp.
 */
export function createEventEmitter(
  writeEvent: (message: CommandEventMessage) => void,
  traceId?: string
): (event: CommandEvent) => void {
  let sequence = 0
  return (event: CommandEvent) => {
    const message: CommandEventMessage = {
      sequence: sequence++,
      timestamp: new Date().toISOString(),
      event,
    }
    if (traceId) {
      message.traceId = traceId
    }
    writeEvent(message)
  }
}

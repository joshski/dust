/**
 * Command event types for the dust back channel protocol.
 *
 * These types define structured events emitted by dust commands
 * to a file descriptor specified by DUST_EVENTS_FD. Events are
 * written as newline-delimited JSON using the CommandEventMessage envelope.
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

/**
 * Wire format for command events, following the same pattern as EventMessage.
 */
export interface CommandEventMessage {
  sequence: number
  timestamp: string
  event: CommandEvent
}

/**
 * Creates an event emitter function that writes command events to a callback.
 * Each event is wrapped in a CommandEventMessage envelope with sequence and timestamp.
 */
export function createEventEmitter(
  writeEvent: (message: CommandEventMessage) => void
): (event: CommandEvent) => void {
  let sequence = 0
  return (event: CommandEvent) => {
    writeEvent({
      sequence: sequence++,
      timestamp: new Date().toISOString(),
      event,
    })
  }
}

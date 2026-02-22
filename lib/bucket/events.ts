/**
 * Bucket event types and WebSocket event sending.
 *
 * BucketEvent types are local-only (UI lifecycle). Wire events use
 * EventMessage from agent-events.ts and are sent via createEventMessageSender.
 */

import type { EventMessage } from '../agent-events'

// WebSocket readyState constants
export const WS_OPEN = 1
export const WS_CLOSED = 3

export interface WebSocketLike {
  onopen: (() => void) | null
  onclose: ((event: { code: number; reason: string }) => void) | null
  onerror: ((error: Error) => void) | null
  onmessage: ((event: { data: string }) => void) | null
  close: () => void
  send: (data: string) => void
  readyState: number
}

// Local-only bucket event types (UI lifecycle, never sent over wire)
interface BucketConnectedEvent {
  type: 'bucket.connected'
}

interface BucketDisconnectedEvent {
  type: 'bucket.disconnected'
  code: number
  reason: string
}

export interface BucketRepositoryAddedEvent {
  type: 'bucket.repository_added'
  repository: string
}

export interface BucketRepositoryRemovedEvent {
  type: 'bucket.repository_removed'
  repository: string
}

export interface BucketErrorEvent {
  type: 'bucket.error'
  repository?: string
  error: string
}

export type BucketEvent =
  | BucketConnectedEvent
  | BucketDisconnectedEvent
  | BucketRepositoryAddedEvent
  | BucketRepositoryRemovedEvent
  | BucketErrorEvent

export type BucketEmitFn = (event: BucketEvent) => void

export type SendEventFn = (msg: EventMessage) => void

// Format event for console output
export function formatBucketEvent(event: BucketEvent): string {
  switch (event.type) {
    case 'bucket.connected':
      return 'Connected to dustbucket'
    case 'bucket.disconnected':
      return `Disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`
    case 'bucket.repository_added':
      return `Added repository: ${event.repository}`
    case 'bucket.repository_removed':
      return `Removed repository: ${event.repository}`
    case 'bucket.error':
      return event.repository
        ? `Error for ${event.repository}: ${event.error}`
        : `Error: ${event.error}`
  }
}

// Create a sender that serializes EventMessage and sends via WebSocket
export function createEventMessageSender(
  getWebSocket: () => WebSocketLike | null
): SendEventFn {
  return (msg: EventMessage) => {
    const ws = getWebSocket()
    if (ws && ws.readyState === WS_OPEN) {
      try {
        ws.send(JSON.stringify(msg))
      } catch {
        // Fire-and-forget: ignore send errors
      }
    }
  }
}

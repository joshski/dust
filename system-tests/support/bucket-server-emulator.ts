/**
 * Bucket server emulator for integration tests.
 *
 * Provides a fake WebSocketLike that emulates the dustbucket server.
 * Captures all messages sent by the client and can inject server messages.
 */

import { EventEmitter } from 'node:events'
import { type WebSocketLike, WS_OPEN } from '../../lib/bucket/events'

interface CapturedMessage {
  raw: string
  parsed: unknown
}

interface BucketServerEmulator {
  /** Factory for BucketDependencies.createWebSocket */
  createWebSocket: (url: string, token: string) => WebSocketLike
  /** Messages sent by the client (captured) */
  messages: CapturedMessage[]
  /** Send a message from the server to the client */
  serverSend: (data: unknown) => void
  /** The token used to connect */
  token: string | undefined
}

/**
 * Creates a bucket server emulator.
 *
 * @param initialMessages - Messages to send to the client shortly after connection
 */
export function createBucketServerEmulator(
  initialMessages: unknown[] = []
): BucketServerEmulator {
  const messages: CapturedMessage[] = []
  let emitter: EventEmitter | undefined
  let wsReadyState = 0
  let connectedToken: string | undefined

  const serverSend = (data: unknown) => {
    if (emitter && wsReadyState === WS_OPEN) {
      emitter.emit('message', { data: JSON.stringify(data) })
    }
  }

  const createWebSocket = (_url: string, token: string): WebSocketLike => {
    connectedToken = token
    const localEmitter = new EventEmitter()
    emitter = localEmitter

    const fakeWs: WebSocketLike = {
      readyState: 0,
      addEventListener: (type, handler) => localEmitter.on(type, handler),
      close: () => {
        wsReadyState = 3
        fakeWs.readyState = 3
      },
      send: (data: string) => {
        let parsed: unknown
        try {
          parsed = JSON.parse(data)
        } catch {
          parsed = data
        }
        messages.push({ raw: data, parsed })
      },
    }

    // Simulate async connection establishment
    setTimeout(() => {
      wsReadyState = WS_OPEN
      fakeWs.readyState = WS_OPEN
      localEmitter.emit('open')

      // Send initial server messages after bucket worker sets up message handlers.
      // connectWebSocket registers handlers synchronously after waitForConnection resolves,
      // so a short delay after open is sufficient.
      setTimeout(() => {
        for (const msg of initialMessages) {
          serverSend(msg)
        }
      }, 50)
    }, 10)

    return fakeWs
  }

  return {
    createWebSocket,
    messages,
    serverSend,
    get token() {
      return connectedToken
    },
  }
}

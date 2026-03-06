import { createServer as createHttpServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { CommandEventMessage } from '../command-events'

const MAX_BODY_BYTES = 1024 * 1024

export interface CommandEventsProxy {
  port: number
  stop: () => Promise<void>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isCommandEventMessage(
  payload: unknown
): payload is CommandEventMessage {
  if (!isRecord(payload)) return false
  if (typeof payload.sequence !== 'number') return false
  if (typeof payload.timestamp !== 'string' || payload.timestamp.length === 0) {
    return false
  }
  if (!isRecord(payload.event)) return false
  return typeof payload.event.type === 'string'
}

/**
 * Start a local HTTP proxy that accepts command events on POST /events.
 * Accepted payloads are forwarded to the bucket WebSocket channel.
 */
export async function startCommandEventsProxy(
  forwardEvent: (event: CommandEventMessage) => void
): Promise<CommandEventsProxy> {
  const server = createHttpServer((request, response) => {
    const method = request.method
    const pathname = (request.url as string).split('?')[0]

    if (pathname !== '/events') {
      response.writeHead(404).end('Not Found')
      return
    }
    if (method !== 'POST') {
      response.writeHead(405).end('Method Not Allowed')
      return
    }

    request.setEncoding('utf8')
    let body = ''

    request.on('data', (chunk: string) => {
      body += chunk
      if (body.length > MAX_BODY_BYTES) {
        response.writeHead(413).end('Payload Too Large')
        request.destroy()
      }
    })

    request.on('end', () => {
      let parsedBody: unknown
      try {
        parsedBody = JSON.parse(body)
      } catch {
        response.writeHead(400).end('Invalid JSON')
        return
      }

      if (!isCommandEventMessage(parsedBody)) {
        response.writeHead(400).end('Invalid command event payload')
        return
      }

      try {
        forwardEvent(parsedBody)
        response.writeHead(202).end('Accepted')
      } catch {
        response.writeHead(502).end('Event forwarding failed')
      }
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })

  const address = server.address() as AddressInfo

  return {
    port: address.port,
    stop: () =>
      new Promise<void>(resolve => {
        server.closeAllConnections?.()
        server.closeIdleConnections?.()
        server.close(() => {
          resolve()
        })
      }),
  }
}

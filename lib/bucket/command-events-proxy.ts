import { createServer as createHttpServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { CommandEventMessage } from '../command-events'
import { createLogger } from '../logging'
import type { ToolDefinition } from './server-messages'

const log = createLogger('dust:bucket:command-events-proxy')

const MAX_BODY_BYTES = 1024 * 1024
const PROXY_ERROR_STATUS = 502

export interface CommandEventsProxy {
  port: number
  stop: () => Promise<void>
}

export interface ToolExecutionRequest {
  toolName: string
  arguments: string[]
  repositoryId: string
}

export type ToolExecutionStatus = 'success' | 'tool-not-found' | 'error'

export interface ToolExecutionResult {
  status: ToolExecutionStatus
  output?: string
  error?: string
}

interface CommandEventsProxyHandlers {
  forwardEvent: (event: CommandEventMessage) => void
  getTools: () => ToolDefinition[]
  forwardToolExecution: (
    request: ToolExecutionRequest
  ) => Promise<ToolExecutionResult>
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

function isToolExecutionRequestBody(
  payload: unknown
): payload is { arguments: string[]; repositoryId: string } {
  if (!isRecord(payload)) return false
  if (!Array.isArray(payload.arguments)) return false
  if (!payload.arguments.every(arg => typeof arg === 'string')) {
    return false
  }
  return typeof payload.repositoryId === 'string' && payload.repositoryId !== ''
}

function parseToolName(pathname: string): string | null {
  const match = pathname.match(/^\/tools\/([^/]+)$/)
  if (!match) return null
  return decodeURIComponent(match[1])
}

function respondJson(
  response: import('node:http').ServerResponse,
  statusCode: number,
  payload: unknown
): void {
  response.writeHead(statusCode, { 'content-type': 'application/json' })
  response.end(JSON.stringify(payload))
}

function mapToolResultStatusToHttpStatus(status: ToolExecutionStatus): number {
  switch (status) {
    case 'success':
      return 200
    case 'tool-not-found':
      return 404
    case 'error':
      return PROXY_ERROR_STATUS
  }
}

/**
 * Start a local HTTP proxy that accepts command events on POST /events.
 * Accepted payloads are forwarded to the bucket WebSocket channel.
 */
export async function startCommandEventsProxy(
  handlers: CommandEventsProxyHandlers
): Promise<CommandEventsProxy> {
  const server = createHttpServer((request, response) => {
    const method = request.method
    const pathname = (request.url as string).split('?')[0]

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
      if (pathname === '/events') {
        if (method !== 'POST') {
          response.writeHead(405).end('Method Not Allowed')
          return
        }
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
          handlers.forwardEvent(parsedBody)
          log(`forwarded event: ${parsedBody.event.type}`)
          response.writeHead(202).end('Accepted')
        } catch (error) /* v8 ignore start */ {
          const msg = error instanceof Error ? error.message : String(error)
          log(`event forwarding failed: ${msg}`)
          response.writeHead(PROXY_ERROR_STATUS).end('Event forwarding failed')
        } /* v8 ignore stop */
        return
      }

      if (pathname === '/tools') {
        if (method !== 'GET') {
          response.writeHead(405).end('Method Not Allowed')
          return
        }

        respondJson(response, 200, {
          tools: handlers.getTools(),
        })
        return
      }

      const toolName = parseToolName(pathname)
      if (toolName) {
        if (method !== 'POST') {
          response.writeHead(405).end('Method Not Allowed')
          return
        }
        let parsedBody: unknown
        try {
          parsedBody = JSON.parse(body)
        } catch {
          response.writeHead(400).end('Invalid JSON')
          return
        }

        if (!isToolExecutionRequestBody(parsedBody)) {
          response.writeHead(400).end('Invalid tool execution payload')
          return
        }

        log(
          `tool execution request: ${toolName} (repo=${parsedBody.repositoryId})`
        )
        handlers
          .forwardToolExecution({
            toolName,
            arguments: parsedBody.arguments,
            repositoryId: parsedBody.repositoryId,
          })
          .then(result => {
            log(`tool execution result: ${toolName} status=${result.status}`)
            respondJson(
              response,
              mapToolResultStatusToHttpStatus(result.status),
              {
                success: result.status === 'success',
                output: result.output,
                error: result.error,
                status: result.status,
              }
            )
          })
          .catch(error => {
            const message =
              error instanceof Error ? error.message : String(error)
            log(`tool execution error: ${toolName} ${message}`)
            respondJson(response, PROXY_ERROR_STATUS, {
              success: false,
              error: message,
              status: 'error',
            })
          })
        return
      }

      response.writeHead(404).end('Not Found')
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
  log(`proxy listening on port ${address.port}`)

  return {
    port: address.port,
    stop: () =>
      new Promise<void>(resolve => {
        log('proxy stopping')
        server.closeAllConnections?.()
        server.closeIdleConnections?.()
        server.close(() => {
          log('proxy stopped')
          resolve()
        })
      }),
  }
}

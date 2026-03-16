/**
 * Claude API Proxy Server
 *
 * An HTTP server that proxies Claude API requests from Docker containers.
 * The container sends plain HTTP requests to this proxy, and the proxy
 * forwards them to the Anthropic API with the OAuth token injected.
 *
 * This allows removing:
 * - CLAUDE_CODE_OAUTH_TOKEN environment variable from containers
 * - ~/.claude mount (currently read-write for OAuth token refresh)
 * - ~/.claude.json mount
 *
 * The proxy handles token management (including refresh) on the host side.
 *
 * Flow:
 * ```
 * Container: HTTP request to proxy:3002/v1/messages
 *     → Proxy receives plain HTTP request
 *     → Proxy reads OAuth token from ~/.claude/.credentials.json
 *     → Proxy forwards to https://api.anthropic.com/v1/messages with Authorization header
 *     → Returns response to container
 * ```
 */

import { readFileSync } from 'node:fs'
import { createServer as httpCreateServer } from 'node:http'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createLogger } from '../logging'

const log = createLogger('dust:proxy:claude-api')

const ANTHROPIC_API_HOST = 'https://api.anthropic.com'

export interface ClaudeApiProxyDependencies {
  homedir: () => string
  readFileSync: (path: string, encoding: 'utf-8') => string
  fetch: typeof fetch
}

/* v8 ignore start - default dependencies are used at runtime, not in unit tests */
export const defaultDependencies: ClaudeApiProxyDependencies = {
  homedir,
  readFileSync: (path, encoding) => readFileSync(path, encoding),
  fetch,
}
/* v8 ignore stop */

/**
 * Credentials stored in ~/.claude/.credentials.json by Claude Code
 */
export interface ClaudeCredentials {
  claudeAiOauth?: {
    accessToken?: string
    refreshToken?: string
    expiresAt?: string
  }
}

/**
 * Read OAuth token from Claude Code's credentials file.
 * Returns null if the file doesn't exist or doesn't contain a valid token.
 */
export function readOAuthToken(
  dependencies: ClaudeApiProxyDependencies = defaultDependencies
): string | null {
  // First check if CLAUDE_CODE_OAUTH_TOKEN is set in the host environment
  const envToken = process.env.CLAUDE_CODE_OAUTH_TOKEN
  if (envToken) {
    log('using OAuth token from CLAUDE_CODE_OAUTH_TOKEN environment variable')
    return envToken
  }

  // Fall back to reading from ~/.claude/.credentials.json
  const credentialsPath = join(
    dependencies.homedir(),
    '.claude',
    '.credentials.json'
  )

  try {
    const content = dependencies.readFileSync(credentialsPath, 'utf-8')
    const credentials = JSON.parse(content) as ClaudeCredentials

    const token = credentials.claudeAiOauth?.accessToken
    if (token) {
      log('read OAuth token from credentials file')
      return token
    }

    log('no accessToken found in credentials file')
    return null
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log(`failed to read credentials file: ${message}`)
    return null
  }
}

/**
 * Check if the OAuth token is expired or about to expire.
 * Returns true if the token expires within the next 5 minutes.
 */
export function isTokenExpired(
  dependencies: ClaudeApiProxyDependencies = defaultDependencies
): boolean {
  const credentialsPath = join(
    dependencies.homedir(),
    '.claude',
    '.credentials.json'
  )

  try {
    const content = dependencies.readFileSync(credentialsPath, 'utf-8')
    const credentials = JSON.parse(content) as ClaudeCredentials

    const expiresAt = credentials.claudeAiOauth?.expiresAt
    if (!expiresAt) {
      // No expiry info, assume token is valid
      return false
    }

    const expiryTime = new Date(expiresAt).getTime()
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000

    return expiryTime - now < fiveMinutes
  } catch {
    // If we can't read the file, assume token is valid
    return false
  }
}

export interface ClaudeApiProxyServer {
  port: number
  stop: () => void
}

const HEADERS_TO_FORWARD = [
  'content-type',
  'anthropic-version',
  'anthropic-beta',
  'accept',
  'accept-encoding',
] as const

export interface ProxyRequestConfig {
  url: string
  headers: Record<string, string>
}

/**
 * Build the proxy request configuration for forwarding to the Anthropic API.
 * Returns the upstream URL and headers with the token injected.
 */
export function buildProxyRequest(
  pathname: string,
  search: string,
  token: string,
  incomingHeaders: Record<string, string | string[] | undefined>
): ProxyRequestConfig {
  const upstreamUrl = new URL(`${ANTHROPIC_API_HOST}${pathname}`)
  upstreamUrl.search = search

  const headers: Record<string, string> = {
    'x-api-key': token,
  }

  for (const headerName of HEADERS_TO_FORWARD) {
    const value = incomingHeaders[headerName]
    if (value && typeof value === 'string') {
      headers[headerName] = value
    }
  }

  return {
    url: upstreamUrl.toString(),
    headers,
  }
}

/**
 * Filter response headers from upstream response for forwarding to the client.
 * Removes transfer-encoding as we're not chunking.
 */
export function filterResponseHeaders(
  upstreamHeaders: Headers
): Record<string, string> {
  const responseHeaders: Record<string, string> = {}
  upstreamHeaders.forEach((value, key) => {
    if (key.toLowerCase() !== 'transfer-encoding') {
      responseHeaders[key] = value
    }
  })
  return responseHeaders
}

export interface ErrorResponse {
  statusCode: number
  contentType: string
  body: string
}

/**
 * Build a 401 response for when no OAuth token is available.
 */
export function buildNoTokenResponse(): ErrorResponse {
  return {
    statusCode: 401,
    contentType: 'text/plain',
    body: 'Could not obtain OAuth token',
  }
}

/**
 * Build a 502 response for when the upstream request fails.
 */
export function buildUpstreamErrorResponse(error: unknown): ErrorResponse {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return {
    statusCode: 502,
    contentType: 'text/plain',
    body: `Upstream request failed: ${message}`,
  }
}

/* v8 ignore start - HTTP response helper, tested via system tests */
function sendErrorResponse(
  nodeResponse: import('node:http').ServerResponse,
  errorResponse: ErrorResponse
): void {
  nodeResponse.writeHead(errorResponse.statusCode, {
    'Content-Type': errorResponse.contentType,
  })
  nodeResponse.end(errorResponse.body)
}

async function streamResponseBody(
  body: ReadableStream<Uint8Array>,
  nodeResponse: import('node:http').ServerResponse
): Promise<void> {
  const reader = body.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      nodeResponse.write(value)
    }
  } finally {
    reader.releaseLock()
  }
}
/* v8 ignore stop */

/**
 * Creates a Claude API proxy server.
 * The server accepts HTTP requests and forwards them to the Anthropic API
 * with the OAuth token injected.
 */
export async function createClaudeApiProxyServer(
  dependencies: ClaudeApiProxyDependencies = defaultDependencies
): Promise<ClaudeApiProxyServer> {
  let resolvedPort = 0

  /* v8 ignore start - HTTP server wiring, tested via system tests */
  const server = httpCreateServer(async (nodeRequest, nodeResponse) => {
    const method = nodeRequest.method ?? 'GET'
    const url = new URL(
      nodeRequest.url ?? '/',
      `http://localhost:${resolvedPort}`
    )

    log(`${method} ${url.pathname}${url.search}`)

    // Read the OAuth token
    const token = readOAuthToken(dependencies)
    if (!token) {
      sendErrorResponse(nodeResponse, buildNoTokenResponse())
      return
    }

    // Build proxy request configuration
    const proxyRequest = buildProxyRequest(
      url.pathname,
      url.search,
      token,
      nodeRequest.headers
    )

    // Read request body if present
    const chunks: Buffer[] = []
    for await (const chunk of nodeRequest) {
      chunks.push(chunk as Buffer)
    }
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined

    log(`forwarding ${method} to ${proxyRequest.url}`)

    try {
      const upstreamResponse = await dependencies.fetch(proxyRequest.url, {
        method,
        headers: proxyRequest.headers,
        body,
      })

      const responseHeaders = filterResponseHeaders(upstreamResponse.headers)

      log(`upstream responded: ${upstreamResponse.status}`)
      nodeResponse.writeHead(upstreamResponse.status, responseHeaders)

      // Stream the response body
      if (upstreamResponse.body) {
        await streamResponseBody(upstreamResponse.body, nodeResponse)
      }

      nodeResponse.end()
    } catch (error) {
      log(
        `upstream request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      sendErrorResponse(nodeResponse, buildUpstreamErrorResponse(error))
    }
  })

  await new Promise<void>(resolve => {
    server.listen(0, () => {
      const addr = server.address()
      if (addr && typeof addr === 'object') {
        resolvedPort = addr.port
        log(`claude api proxy listening on port ${resolvedPort}`)
      }
      resolve()
    })
  })

  return {
    port: resolvedPort,
    stop: () => {
      server.close()
      log('claude api proxy stopped')
    },
  }
  /* v8 ignore stop */
}

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
import {
  type HelperTokenState,
  createHelperTokenState,
  isCurrentTokenValid,
  isHelperTokenValid,
  rotateHelperToken,
} from './helper-token'

const log = createLogger('dust:proxy:claude-api')

const ANTHROPIC_API_HOST = 'https://api.anthropic.com'
const OAUTH_BETA_FLAG = 'oauth-2025-04-20'

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

/**
 * Represents an incoming proxy request in a platform-agnostic way.
 */
export interface ProxyRequest {
  method: string
  pathname: string
  search: string
  headers: Record<string, string | string[] | undefined>
  body: BodyInit | null | undefined
}

/**
 * Represents a proxy response in a platform-agnostic way.
 */
export type ProxyResponse =
  | {
      kind: 'success'
      status: number
      headers: Record<string, string>
      body: ReadableStream<Uint8Array> | null
    }
  | {
      kind: 'error'
      status: number
      contentType: string
      body: string
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

export function mergeAnthropicBetaHeader(
  incomingHeader: string | string[] | undefined
): string {
  if (
    typeof incomingHeader !== 'string' ||
    incomingHeader.trim().length === 0
  ) {
    return OAUTH_BETA_FLAG
  }

  const parts = incomingHeader
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)

  if (parts.includes(OAUTH_BETA_FLAG)) {
    return parts.join(',')
  }

  return `${parts.join(',')},${OAUTH_BETA_FLAG}`
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
    authorization: `Bearer ${token}`,
    'anthropic-beta': mergeAnthropicBetaHeader(
      incomingHeaders['anthropic-beta']
    ),
  }

  for (const headerName of HEADERS_TO_FORWARD) {
    if (headerName === 'anthropic-beta') {
      continue
    }
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
    const lowercaseKey = key.toLowerCase()
    if (
      lowercaseKey !== 'transfer-encoding' &&
      lowercaseKey !== 'content-encoding' &&
      lowercaseKey !== 'content-length'
    ) {
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
 * Build a 401 response for when the helper token is invalid or expired.
 */
export function buildInvalidHelperTokenResponse(): ErrorResponse {
  return {
    statusCode: 401,
    contentType: 'text/plain',
    body: 'Invalid or expired helper token',
  }
}

/**
 * Extract the helper token from incoming request headers.
 * Checks both Authorization header (Bearer token) and x-api-key header.
 */
export function extractHelperToken(
  headers: Record<string, string | string[] | undefined>
): string | null {
  // Check Authorization header first
  const authHeader = headers['authorization']
  if (typeof authHeader === 'string') {
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
    if (bearerMatch) {
      return bearerMatch[1]
    }
  }

  // Fall back to x-api-key header
  const apiKey = headers['x-api-key']
  if (typeof apiKey === 'string') {
    return apiKey
  }

  return null
}

/**
 * Validate the incoming helper token against the issued token.
 */
export function validateHelperToken(
  incomingToken: string | null,
  state: HelperTokenState,
  now: number = Date.now()
): boolean {
  if (!incomingToken || !state.current) {
    return false
  }
  return isHelperTokenValid(incomingToken, state.current, now)
}

/**
 * Get the current helper token, rotating if needed.
 * Returns the new state and the token string.
 */
export function getOrRefreshHelperToken(
  state: HelperTokenState,
  now: number = Date.now()
): { state: HelperTokenState; token: string } {
  if (!isCurrentTokenValid(state, now)) {
    const newState = rotateHelperToken(state, now)
    return { state: newState, token: newState.current!.token }
  }
  return { state, token: state.current!.token }
}

/**
 * Build a success response containing the helper token.
 */
export function buildTokenResponse(token: string): ProxyResponse {
  return {
    kind: 'error', // Using 'error' kind for simple text response
    status: 200,
    contentType: 'text/plain',
    body: token,
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

/**
 * Handle a proxy request and return a platform-agnostic response.
 * This is the pure core of the proxy logic, separated from HTTP plumbing.
 *
 * When helperTokenState is provided, incoming requests must include a valid
 * helper token in the Authorization or x-api-key header.
 */
export async function handleProxyRequest(
  request: ProxyRequest,
  dependencies: ClaudeApiProxyDependencies,
  helperTokenState?: HelperTokenState,
  now: number = Date.now()
): Promise<ProxyResponse> {
  log(`${request.method} ${request.pathname}${request.search}`)

  // Validate helper token if state is provided
  if (helperTokenState) {
    const incomingToken = extractHelperToken(request.headers)
    if (!validateHelperToken(incomingToken, helperTokenState, now)) {
      log('invalid or expired helper token')
      const errorResponse = buildInvalidHelperTokenResponse()
      return {
        kind: 'error',
        status: errorResponse.statusCode,
        contentType: errorResponse.contentType,
        body: errorResponse.body,
      }
    }
  }

  const token = readOAuthToken(dependencies)
  if (!token) {
    const errorResponse = buildNoTokenResponse()
    return {
      kind: 'error',
      status: errorResponse.statusCode,
      contentType: errorResponse.contentType,
      body: errorResponse.body,
    }
  }

  const proxyRequestConfig = buildProxyRequest(
    request.pathname,
    request.search,
    token,
    request.headers
  )

  log(`forwarding ${request.method} to ${proxyRequestConfig.url}`)

  try {
    const upstreamResponse = await dependencies.fetch(proxyRequestConfig.url, {
      method: request.method,
      headers: proxyRequestConfig.headers,
      body: request.body,
    })

    const responseHeaders = filterResponseHeaders(upstreamResponse.headers)

    log(`upstream responded: ${upstreamResponse.status}`)

    return {
      kind: 'success',
      status: upstreamResponse.status,
      headers: responseHeaders,
      body: upstreamResponse.body,
    }
  } catch (error) {
    log(
      `upstream request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
    const errorResponse = buildUpstreamErrorResponse(error)
    return {
      kind: 'error',
      status: errorResponse.statusCode,
      contentType: errorResponse.contentType,
      body: errorResponse.body,
    }
  }
}

/* v8 ignore start - Node.js HTTP adaptation, tested via system tests */
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

async function writeProxyResponse(
  proxyResponse: ProxyResponse,
  nodeResponse: import('node:http').ServerResponse
): Promise<void> {
  if (proxyResponse.kind === 'error') {
    nodeResponse.writeHead(proxyResponse.status, {
      'Content-Type': proxyResponse.contentType,
    })
    nodeResponse.end(proxyResponse.body)
  } else {
    nodeResponse.writeHead(proxyResponse.status, proxyResponse.headers)
    if (proxyResponse.body) {
      await streamResponseBody(proxyResponse.body, nodeResponse)
    }
    nodeResponse.end()
  }
}

async function readNodeRequestBody(
  nodeRequest: import('node:http').IncomingMessage
): Promise<ArrayBuffer | undefined> {
  const chunks: Buffer[] = []
  for await (const chunk of nodeRequest) {
    chunks.push(chunk as Buffer)
  }
  if (chunks.length === 0) return undefined
  const combined = Buffer.concat(chunks)
  return combined.buffer.slice(
    combined.byteOffset,
    combined.byteOffset + combined.byteLength
  )
}
/* v8 ignore stop */

/**
 * Creates a Claude API proxy server.
 * The server accepts HTTP requests and forwards them to the Anthropic API
 * with the OAuth token injected.
 *
 * The server maintains helper token state and provides a `/token` endpoint
 * that returns the current helper token. All other requests must include
 * a valid helper token in the Authorization or x-api-key header.
 */
export async function createClaudeApiProxyServer(
  dependencies: ClaudeApiProxyDependencies = defaultDependencies
): Promise<ClaudeApiProxyServer> {
  let resolvedPort = 0
  let helperTokenState = createHelperTokenState()

  /* v8 ignore start - Node.js HTTP adaptation, tested via system tests */
  const server = httpCreateServer(async (nodeRequest, nodeResponse) => {
    const method = nodeRequest.method ?? 'GET'
    const url = new URL(
      nodeRequest.url ?? '/',
      `http://localhost:${resolvedPort}`
    )

    // Handle /token endpoint
    if (url.pathname === '/token' && method === 'GET') {
      const result = getOrRefreshHelperToken(helperTokenState)
      helperTokenState = result.state
      const response = buildTokenResponse(result.token)
      await writeProxyResponse(response, nodeResponse)
      return
    }

    const body = await readNodeRequestBody(nodeRequest)

    const proxyRequest: ProxyRequest = {
      method,
      pathname: url.pathname,
      search: url.search,
      headers: nodeRequest.headers,
      body,
    }

    const proxyResponse = await handleProxyRequest(
      proxyRequest,
      dependencies,
      helperTokenState
    )
    await writeProxyResponse(proxyResponse, nodeResponse)
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

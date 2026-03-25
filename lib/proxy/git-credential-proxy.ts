/**
 * Git Credential Proxy Server
 *
 * An HTTP server that proxies git requests from Docker containers.
 * The container talks plain HTTP to this proxy, and the proxy forwards
 * requests to the upstream HTTPS URL with credentials injected.
 *
 * The proxy uses the host's existing git credential system (`git credential fill`)
 * so no new auth setup is required from the user.
 *
 * Flow:
 * ```
 * Container: git clone http://host.docker.internal:<port>/org/repo.git
 *     → Proxy receives plain HTTP git smart protocol request
 *     → Proxy runs `git credential fill` on host to get credentials
 *     → Proxy forwards as https://github.com/org/repo.git with Authorization header
 *     → Returns response to container
 * ```
 */

import type { spawn as nodeSpawn } from 'node:child_process'
import { createServer as httpCreateServer } from 'node:http'
import { createLogger } from '../logging'

const log = createLogger('dust:proxy:git-credential')

export interface GitCredentialProxyDependencies {
  spawn: typeof nodeSpawn
  /** Real user HOME directory — used when the process HOME has been overridden */
  userHome?: string
}

export interface GitCredentials {
  username: string
  password: string
}

/**
 * Parse a git URL path to extract the host, owner, and repo.
 * Expected format: /<host>/<owner>/<repo>.git or /<owner>/<repo>.git (defaults to github.com)
 */
export function parseGitPath(
  urlPath: string
): { host: string; owner: string; repo: string } | null {
  // Remove leading slash and trailing .git
  const cleanPath = urlPath.replace(/^\//, '').replace(/\.git\/?$/, '')
  const parts = cleanPath.split('/')

  // Check for git endpoints that need to be stripped
  const gitEndpoints = ['info', 'git-upload-pack', 'git-receive-pack']
  const filtered = parts.filter(p => !gitEndpoints.includes(p) && p !== 'refs')

  if (filtered.length === 2) {
    // Format: /owner/repo.git - assume github.com
    return { host: 'github.com', owner: filtered[0], repo: filtered[1] }
  }
  if (filtered.length === 3) {
    // Format: /host/owner/repo.git
    return { host: filtered[0], owner: filtered[1], repo: filtered[2] }
  }

  return null
}

/**
 * Runs `git credential fill` to obtain credentials for a given URL.
 * Returns the username and password from the git credential helper.
 */
export async function getGitCredentials(
  host: string,
  dependencies: GitCredentialProxyDependencies
): Promise<GitCredentials | null> {
  return new Promise(resolve => {
    const spawnOptions: import('node:child_process').SpawnOptions = {
      stdio: ['pipe', 'pipe', 'pipe'],
    }
    if (dependencies.userHome) {
      spawnOptions.env = { ...process.env, HOME: dependencies.userHome }
    }
    const proc = dependencies.spawn('git', ['credential', 'fill'], spawnOptions)

    // Send the credential query
    const input = `protocol=https\nhost=${host}\n\n`
    proc.stdin?.write(input)
    proc.stdin?.end()

    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', code => {
      if (code !== 0) {
        log(`git credential fill failed: ${stderr}`)
        resolve(null)
        return
      }

      // Parse the output to extract username and password
      const lines = stdout.split('\n')
      let username: string | undefined
      let password: string | undefined

      for (const line of lines) {
        const [key, value] = line.split('=')
        if (key === 'username') {
          username = value
        } else if (key === 'password') {
          password = value
        }
      }

      if (username && password) {
        log(`obtained credentials for ${host}`)
        resolve({ username, password })
      } else {
        log(`no credentials found for ${host}`)
        resolve(null)
      }
    })

    proc.on('error', error => {
      log(`git credential fill error: ${error.message}`)
      resolve(null)
    })
  })
}

/**
 * Creates the Authorization header value for git HTTP authentication.
 * Uses Basic authentication with base64-encoded credentials.
 */
export function createAuthHeader(credentials: GitCredentials): string {
  const encoded = Buffer.from(
    `${credentials.username}:${credentials.password}`
  ).toString('base64')
  return `Basic ${encoded}`
}

/**
 * Extracts the git smart protocol endpoint from a URL path.
 * Git smart protocol uses these endpoints:
 * - /info/refs?service=git-upload-pack (fetch/clone discovery)
 * - /info/refs?service=git-receive-pack (push discovery)
 * - /git-upload-pack (fetch/clone data)
 * - /git-receive-pack (push data)
 */
export function extractGitEndpoint(
  urlPath: string
): { basePath: string; endpoint: string } | null {
  // Match paths ending with git endpoints
  const uploadPackMatch = urlPath.match(/^(.+)\/git-upload-pack$/)
  if (uploadPackMatch) {
    return { basePath: uploadPackMatch[1], endpoint: 'git-upload-pack' }
  }

  const receivePackMatch = urlPath.match(/^(.+)\/git-receive-pack$/)
  if (receivePackMatch) {
    return { basePath: receivePackMatch[1], endpoint: 'git-receive-pack' }
  }

  const infoRefsMatch = urlPath.match(/^(.+)\/info\/refs$/)
  if (infoRefsMatch) {
    return { basePath: infoRefsMatch[1], endpoint: 'info/refs' }
  }

  return null
}

export interface GitCredentialProxyServer {
  port: number
  stop: () => void
}

/* istanbul ignore next @preserve -- HTTP server integration, tested via system tests */
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
/**
 * Creates a git credential proxy server.
 * The server accepts git smart HTTP protocol requests and forwards them
 * to the upstream HTTPS URL with credentials injected.
 */
/* istanbul ignore next @preserve -- HTTP server integration, tested via system tests */
export async function createGitCredentialProxyServer(
  dependencies: GitCredentialProxyDependencies
): Promise<GitCredentialProxyServer> {
  let resolvedPort = 0

  const server = httpCreateServer(async (nodeRequest, nodeResponse) => {
    const method = nodeRequest.method ?? 'GET'
    const url = new URL(
      nodeRequest.url ?? '/',
      `http://localhost:${resolvedPort}`
    )

    log(`${method} ${url.pathname}${url.search}`)

    // Extract git endpoint from path
    const endpointInfo = extractGitEndpoint(url.pathname)
    if (!endpointInfo) {
      nodeResponse.writeHead(400, { 'Content-Type': 'text/plain' })
      nodeResponse.end('Invalid git URL path')
      return
    }

    // Parse the repo path
    const repoInfo = parseGitPath(endpointInfo.basePath)
    if (!repoInfo) {
      nodeResponse.writeHead(400, { 'Content-Type': 'text/plain' })
      nodeResponse.end('Could not parse repository path')
      return
    }

    // Get credentials from git credential helper
    const credentials = await getGitCredentials(repoInfo.host, dependencies)
    if (!credentials) {
      nodeResponse.writeHead(401, { 'Content-Type': 'text/plain' })
      nodeResponse.end('Could not obtain git credentials')
      return
    }

    // Build upstream URL
    const upstreamUrl = new URL(
      `https://${repoInfo.host}/${repoInfo.owner}/${repoInfo.repo}.git/${endpointInfo.endpoint}`
    )
    upstreamUrl.search = url.search

    // Read request body if present
    const chunks: Buffer[] = []
    for await (const chunk of nodeRequest) {
      chunks.push(chunk as Buffer)
    }
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined

    // Forward request to upstream
    const headers: Record<string, string> = {
      Authorization: createAuthHeader(credentials),
      'User-Agent': 'git/dust-proxy',
    }

    // Copy content-type if present (important for git smart protocol)
    if (nodeRequest.headers['content-type']) {
      headers['Content-Type'] = nodeRequest.headers['content-type']
    }

    log(
      `forwarding ${method} to ${upstreamUrl.toString()}${body ? ` (${body.length} bytes)` : ''}`
    )

    try {
      const upstreamResponse = await fetch(upstreamUrl.toString(), {
        method,
        headers,
        body,
      })
      log(
        `upstream ${method} ${endpointInfo.endpoint} responded: ${upstreamResponse.status}`
      )

      // Copy upstream response status and headers
      const responseHeaders: Record<string, string> = {}
      upstreamResponse.headers.forEach((value, key) => {
        // Skip transfer-encoding as we're not chunking
        if (key.toLowerCase() !== 'transfer-encoding') {
          responseHeaders[key] = value
        }
      })

      nodeResponse.writeHead(upstreamResponse.status, responseHeaders)

      // Stream the response body
      if (upstreamResponse.body) {
        await streamResponseBody(upstreamResponse.body, nodeResponse)
      }

      nodeResponse.end()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      log(`upstream request failed: ${message}`)
      nodeResponse.writeHead(502, { 'Content-Type': 'text/plain' })
      nodeResponse.end(`Upstream request failed: ${message}`)
    }
  })

  await new Promise<void>(resolve => {
    server.listen(0, () => {
      const addr = server.address()
      if (addr && typeof addr === 'object') {
        resolvedPort = addr.port
        log(`git credential proxy listening on port ${resolvedPort}`)
      }
      resolve()
    })
  })

  return {
    port: resolvedPort,
    stop: () => {
      server.close()
      log('git credential proxy stopped')
    },
  }
}

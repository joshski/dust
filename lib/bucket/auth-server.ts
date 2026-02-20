import { spawn as nodeSpawn } from 'node:child_process'
import { createServer as httpCreateServer } from 'node:http'

/* v8 ignore start - thin wrappers around native functions */
/**
 * Creates a local HTTP server with a request handler.
 * Used for OAuth callback during authentication.
 */
export function createLocalServer(handler: (request: Request) => Response): {
  port: number
  stop: () => void
} {
  let resolvedPort = 0
  const server = httpCreateServer(async (nodeRequest, nodeResponse) => {
    const url = new URL(
      nodeRequest.url ?? '/',
      `http://localhost:${resolvedPort}`
    )
    const request = new Request(url.toString(), {
      method: nodeRequest.method ?? 'GET',
    })
    const response = handler(request)
    const body = await response.text()
    nodeResponse.writeHead(response.status, {
      'Content-Type': response.headers.get('content-type') ?? 'text/plain',
    })
    nodeResponse.end(body)
  })
  server.listen(0, () => {
    const addr = server.address()
    if (addr && typeof addr === 'object') {
      resolvedPort = addr.port
    }
  })
  // Block until port is assigned (listen is sync for port 0 in practice)
  const addr = server.address()
  if (addr && typeof addr === 'object') {
    resolvedPort = addr.port
  }
  return { port: resolvedPort, stop: () => server.close() }
}

/**
 * Opens a URL in the system browser.
 */
export function openBrowser(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open'
  nodeSpawn(cmd, [url], { stdio: 'ignore', detached: true }).unref()
}
/* v8 ignore stop */

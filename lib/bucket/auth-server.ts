import { createServer as httpCreateServer } from 'node:http'
import type { AddressInfo } from 'node:net'

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
    const url = new URL(nodeRequest.url!, `http://localhost:${resolvedPort}`)
    const request = new Request(url.toString(), {
      method: nodeRequest.method!,
    })
    const response = handler(request)
    const body = await response.text()
    nodeResponse.writeHead(response.status, {
      'Content-Type': response.headers.get('content-type')!,
    })
    nodeResponse.end(body)
  })
  server.listen(0)
  // Port 0 causes the OS to assign a free port synchronously
  resolvedPort = (server.address() as AddressInfo).port
  return { port: resolvedPort, stop: () => server.close() }
}

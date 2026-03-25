import { describe, expect, it } from 'vitest'
import { createLocalServer } from './auth-server'

function htmlHandler(request: Request) {
  return new Response(`Hello from ${new URL(request.url).pathname}`, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
}

function echoMethodHandler(request: Request) {
  return new Response(request.method, { status: 200 })
}

function plainTextHandler() {
  return new Response('plain text', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}

describe('createLocalServer', () => {
  it('starts a server that forwards requests to the handler', async () => {
    let capturedRequest: Request | undefined
    const server = createLocalServer((request: Request) => {
      capturedRequest = request
      return htmlHandler(request)
    })

    try {
      expect(server.port).toBeGreaterThan(0)

      const response = await fetch(
        `http://localhost:${server.port}/auth/callback?code=abc`
      )
      const body = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/html')
      expect(body).toBe('Hello from /auth/callback')
      expect(capturedRequest).toBeInstanceOf(Request)
      expect(new URL(capturedRequest!.url).searchParams.get('code')).toBe('abc')
    } finally {
      server.stop()
    }
  })

  it('forwards the request method', async () => {
    const server = createLocalServer(echoMethodHandler)

    try {
      const response = await fetch(`http://localhost:${server.port}/test`)
      const body = await response.text()
      expect(body).toBe('GET')
    } finally {
      server.stop()
    }
  })

  it('forwards content-type header from handler response', async () => {
    const server = createLocalServer(plainTextHandler)

    try {
      const response = await fetch(`http://localhost:${server.port}/`)
      expect(response.headers.get('content-type')).toContain('text/plain')
    } finally {
      server.stop()
    }
  })
})

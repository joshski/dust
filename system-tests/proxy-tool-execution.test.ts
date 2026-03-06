import { spawn } from 'node:child_process'
import { createServer as createHttpServer } from 'node:http'
import { describe, expect, test } from 'vitest'

interface CommandRunResult {
  status: number | null
  stdout: string
  stderr: string
}

interface CapturedRequest {
  path: string
  body: string
}

async function runShellCommand(
  command: string,
  timeoutMs: number
): Promise<CommandRunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', ['-c', command], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
    }, timeoutMs)

    child.on('close', status => {
      clearTimeout(timer)
      resolve({ status, stdout, stderr })
    })
    child.on('error', error => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

async function withToolProxyServer<T>(
  handler: (request: CapturedRequest) => {
    status: number
    body?: Record<string, unknown>
    text?: string
  },
  callback: (port: number, requests: CapturedRequest[]) => Promise<T>
): Promise<T> {
  const requests: CapturedRequest[] = []
  const server = createHttpServer((request, response) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('end', () => {
      const capturedRequest = {
        path: request.url ?? '',
        body: Buffer.concat(chunks).toString('utf8'),
      }
      requests.push(capturedRequest)

      const result = handler(capturedRequest)
      if (result.body) {
        response.writeHead(result.status, {
          'content-type': 'application/json',
        })
        response.end(JSON.stringify(result.body))
        return
      }

      response.writeHead(result.status, { 'content-type': 'text/plain' })
      response.end(result.text ?? '')
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve test server port')
  }

  try {
    return await callback(address.port, requests)
  } finally {
    server.closeAllConnections?.()
    server.closeIdleConnections?.()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
}

describe('bucket tool proxy execution via DUST_PROXY_PORT', () => {
  test('returns successful proxy result and prints output', async () => {
    await withToolProxyServer(
      request => {
        if (request.path === '/tools') {
          return {
            status: 200,
            body: {
              tools: [
                {
                  name: 'asset-upload',
                },
              ],
            },
          }
        }

        return {
          status: 200,
          body: {
            success: true,
            status: 'success',
            output: 'https://example.com/uploaded.png',
          },
        }
      },
      async (port, requests) => {
        const result = await runShellCommand(
          `DUST_PROXY_PORT=${port} DUST_REPOSITORY_ID=repo-123 ${process.cwd()}/bin/dust bucket tool asset-upload /tmp/file.png`,
          30000
        )

        expect(result.status).toBe(0)
        expect(result.stdout).toContain('https://example.com/uploaded.png')
        expect(requests).toHaveLength(2)
        expect(requests[0].path).toBe('/tools')
        expect(requests[1].path).toBe('/tools/asset-upload')
        expect(requests[1].body).toContain('"repositoryId":"repo-123"')
        expect(requests[1].body).toContain('"arguments":["/tmp/file.png"]')
      }
    )
  }, 20000)

  test('returns tool-not-found error from proxy', async () => {
    await withToolProxyServer(
      request => {
        if (request.path === '/tools') {
          return {
            status: 200,
            body: {
              tools: [
                {
                  name: 'missing-tool',
                },
              ],
            },
          }
        }

        return {
          status: 404,
          body: {
            success: false,
            status: 'tool-not-found',
            error: 'Unknown tool: missing-tool',
          },
        }
      },
      async port => {
        const result = await runShellCommand(
          `DUST_PROXY_PORT=${port} DUST_REPOSITORY_ID=repo-123 ${process.cwd()}/bin/dust bucket tool missing-tool`,
          30000
        )

        expect(result.status).toBe(1)
        expect(result.stderr).toContain('Unknown tool: missing-tool')
      }
    )
  }, 20000)

  test('returns proxied execution error from proxy', async () => {
    await withToolProxyServer(
      request => {
        if (request.path === '/tools') {
          return {
            status: 200,
            body: {
              tools: [
                {
                  name: 'asset-upload',
                },
              ],
            },
          }
        }

        return {
          status: 502,
          body: {
            success: false,
            status: 'error',
            error: 'Proxy execution failed',
          },
        }
      },
      async port => {
        const result = await runShellCommand(
          `DUST_PROXY_PORT=${port} DUST_REPOSITORY_ID=repo-123 ${process.cwd()}/bin/dust bucket tool asset-upload /tmp/file.png`,
          30000
        )

        expect(result.status).toBe(1)
        expect(result.stderr).toContain('Proxy execution failed')
      }
    )
  }, 20000)
})

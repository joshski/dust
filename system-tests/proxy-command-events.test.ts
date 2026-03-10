import { spawn, spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createServer as createHttpServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import type { CommandEventMessage } from '../lib/command-events'

interface CapturedRequest {
  path: string
  body: string
}

async function runShellCommand(
  command: string,
  cwd: string,
  timeoutMs: number
): Promise<{ status: number | null; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', ['-c', command], {
      cwd,
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let stderr = ''

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
    }, timeoutMs)

    child.on('close', status => {
      clearTimeout(timer)
      resolve({ status, stderr })
    })
    child.on('error', error => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

async function withEventCaptureServer<T>(
  callback: (port: number, requests: CapturedRequest[]) => T | Promise<T>
): Promise<T> {
  const requests: CapturedRequest[] = []
  const server = createHttpServer((request, response) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })
    request.on('end', () => {
      requests.push({
        path: request.url ?? '',
        body: Buffer.concat(chunks).toString('utf8'),
      })
      response.writeHead(202).end('Accepted')
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
    await new Promise<void>((resolve, reject) => {
      server.close(error => {
        if (
          error &&
          !(error instanceof Error && error.message.includes('not running'))
        ) {
          reject(error)
          return
        }
        resolve()
      })
    })
  }
}

async function getUnusedPort(): Promise<number> {
  const server = createHttpServer((_request, response) => {
    response.writeHead(204).end()
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve temporary port')
  }
  await new Promise<void>((resolve, reject) => {
    server.close(error => {
      if (error) reject(error)
      else resolve()
    })
  })
  return address.port
}

describe('command event emission via DUST_PROXY_PORT', () => {
  test('POSTs command events to /events when DUST_PROXY_PORT is set', async () => {
    await withEventCaptureServer(async (port, requests) => {
      const tempDir = mkdtempSync(join(tmpdir(), 'dust-proxy-events-test-'))
      try {
        mkdirSync(join(tempDir, '.dust', 'tasks'), { recursive: true })
        writeFileSync(
          join(tempDir, '.dust', 'tasks', 'task.md'),
          '# Task\n\nDo something.'
        )

        const result = await runShellCommand(
          `DUST_PROXY_PORT=${port} ${process.cwd()}/bin/dust next > /dev/null`,
          tempDir,
          30000
        )

        expect(result.status).not.toBeNull()
        expect(requests).toHaveLength(1)
        expect(requests[0].path).toBe('/events')
        const payload = JSON.parse(requests[0].body) as CommandEventMessage
        expect(payload.event.type).toBe('tasks-listed')
      } finally {
        rmSync(tempDir, { recursive: true, force: true })
      }
    })
  }, 20000)

  test('forwards nested subprocess command events through the same proxy', async () => {
    await withEventCaptureServer(async (port, requests) => {
      const tempDir = mkdtempSync(join(tmpdir(), 'dust-proxy-nested-test-'))
      try {
        mkdirSync(join(tempDir, '.dust', 'tasks'), { recursive: true })
        mkdirSync(join(tempDir, '.dust', 'config'), { recursive: true })
        writeFileSync(
          join(tempDir, '.dust', 'tasks', 'task.md'),
          '# Nested Task\n\nDo something.'
        )
        writeFileSync(
          join(tempDir, '.dust', 'config', 'settings.json'),
          JSON.stringify({
            dustCommand: 'dust',
            checks: [
              {
                name: 'nested-next',
                command: `"${process.cwd()}/bin/dust" next > /dev/null`,
              },
            ],
          })
        )

        const result = await runShellCommand(
          `DUST_PROXY_PORT=${port} ${process.cwd()}/bin/dust check > /dev/null`,
          tempDir,
          30000
        )

        expect(result.status).not.toBeNull()
        const events = requests.map(request =>
          JSON.parse(request.body)
        ) as CommandEventMessage[]
        const eventTypes = events.map(event => event.event.type)
        expect(eventTypes).toContain('check-started')
        expect(eventTypes).toContain('check-passed')
        expect(eventTypes).toContain('tasks-listed')
      } finally {
        rmSync(tempDir, { recursive: true, force: true })
      }
    })
  }, 30000)

  test('logs proxy transport failures without failing command execution', async () => {
    const port = await getUnusedPort()
    const tempDir = mkdtempSync(join(tmpdir(), 'dust-proxy-failure-test-'))
    const stderrFile = join(tempDir, 'stderr.log')

    try {
      mkdirSync(join(tempDir, '.dust', 'tasks'), { recursive: true })
      writeFileSync(
        join(tempDir, '.dust', 'tasks', 'task.md'),
        '# Task\n\nDo something.'
      )

      const result = spawnSync(
        'bash',
        [
          '-c',
          `DUST_PROXY_PORT=${port} ${process.cwd()}/bin/dust next 2>${stderrFile}`,
        ],
        {
          cwd: tempDir,
          timeout: 30000,
          encoding: 'utf8',
        }
      )

      expect(result.status).not.toBeNull()
      const stderrOutput = readFileSync(stderrFile, 'utf8')
      expect(stderrOutput).toContain('Event proxy POST failed')
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  }, 20000)
})

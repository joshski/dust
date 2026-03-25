/**
 * Integration test for bucket worker RPC.
 *
 * Verifies the parent-child RPC protocol by running the real bucket worker
 * with an emulated bucket server (fake WebSocket) and an emulated LLM
 * (spawns `dust check` instead of Claude). Events flow:
 *
 *   dust check → HTTP POST → command events proxy → ws.send() → bucket server emulator
 *
 * This test proves the full RPC chain works end-to-end.
 */

import { spawn, spawnSync } from 'node:child_process'
import {
  accessSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import {
  chmod,
  mkdir,
  readdir,
  readFile,
  rename,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import type { BoundRunFn, RunOptions, SpawnOptions } from '../lib/claude/types'
import {
  type BucketDependencies,
  bucketWorker,
  createAuthFileSystem,
} from '../lib/cli/commands/bucket-worker'
import type { CommandDependencies } from '../lib/cli/types'
import { createFileSystem, defaultFileSystemPrimitives } from '../lib/cli/wire'
import { realSleep, stubEnv, waitFor } from '../lib/test/test-utilities'
import { createBucketServerEmulator } from './support/bucket-server-emulator'

const DUST_BIN = join(process.cwd(), 'bin', 'dust')

/**
 * Create a local git repo with a .dust project, a task, and check configuration.
 */
function createTestRepo(): string {
  const repoDir = mkdtempSync(join(tmpdir(), 'dust-rpc-test-repo-'))

  spawnSync('git', ['init'], { cwd: repoDir, stdio: 'ignore' })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], {
    cwd: repoDir,
    stdio: 'ignore',
  })
  spawnSync('git', ['config', 'user.name', 'Test'], {
    cwd: repoDir,
    stdio: 'ignore',
  })
  spawnSync('git', ['config', 'commit.gpgsign', 'false'], {
    cwd: repoDir,
    stdio: 'ignore',
  })

  mkdirSync(join(repoDir, '.dust', 'tasks'), { recursive: true })
  mkdirSync(join(repoDir, '.dust', 'config'), { recursive: true })
  writeFileSync(
    join(repoDir, '.dust', 'tasks', 'test-task.md'),
    '# Test Task\n\nImplement a simple test feature.\n'
  )
  writeFileSync(
    join(repoDir, '.dust', 'config', 'settings.json'),
    JSON.stringify({
      checks: [{ name: 'echo-test', command: 'echo ok' }],
    })
  )

  spawnSync('git', ['add', '.'], { cwd: repoDir, stdio: 'ignore' })
  spawnSync('git', ['commit', '-m', 'initial'], {
    cwd: repoDir,
    stdio: 'ignore',
  })

  return repoDir
}

/**
 * Create a real FileSystem for the bucket worker (operates on cloned repos).
 */
function createRealFileSystem() {
  return createFileSystem(defaultFileSystemPrimitives)
}

/**
 * LLM emulator that spawns `dust check` instead of calling Claude.
 * Exercises the RPC chain: dust check subprocess → HTTP POST → proxy → WebSocket.
 */
function createLlmEmulator(
  onComplete: () => void,
  hasEventsForwarded: () => boolean
): BoundRunFn {
  let callCount = 0

  return async function fakeRun(
    _prompt: string,
    options: SpawnOptions | RunOptions
  ): Promise<void> {
    callCount++

    const spawnOpts = 'spawnOptions' in options ? options.spawnOptions : options
    const cwd = spawnOpts?.cwd ?? process.cwd()

    // Spawn `dust check` — this emits command events through the proxy
    // Merge the agent subprocess env (which includes DUST_PROXY_PORT from
    // the per-iteration proxy) with process.env
    const agentEnv = spawnOpts?.env ?? {}
    await new Promise<void>((resolve, reject) => {
      const child = spawn('bash', ['-c', `"${DUST_BIN}" check`], {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...agentEnv },
      })

      child.stdout?.on('data', () => {})
      child.stderr?.on('data', () => {})
      child.on('close', () => resolve())
      child.on('error', reject)
    })

    // Wait for proxy to forward events before triggering shutdown
    await waitFor(() => expect(hasEventsForwarded()).toBe(true))

    if (callCount >= 1) {
      onComplete()
    }
  }
}

describe('bucket worker RPC integration', () => {
  test('command events from dust check flow through proxy to bucket server', async () => {
    const testRepoDir = createTestRepo()
    const reposDir = mkdtempSync(join(tmpdir(), 'dust-rpc-test-repos-'))

    try {
      const serverEmulator = createBucketServerEmulator([
        {
          type: 'repository-list',
          repositories: [
            {
              id: 1,
              name: 'test-repo',
              gitUrl: `file://${testRepoDir}`,
              gitSshUrl: `file://${testRepoDir}`,
              url: 'http://localhost/test-repo',
              hasTask: true,
            },
          ],
        },
      ])

      let triggerShutdown: (() => void) | undefined
      const hasEventsForwarded = () => {
        const messages = serverEmulator.messages.map(m => m.parsed) as Array<
          Record<string, unknown>
        >
        const eventTypes = messages
          .filter(m => (m.event as Record<string, unknown>)?.type)
          .map(m => (m.event as Record<string, unknown>).type as string)
        return eventTypes.includes('command-event')
      }
      const fakeRun = createLlmEmulator(
        () => triggerShutdown?.(),
        hasEventsForwarded
      )

      const fileSystem = createRealFileSystem()
      const authFileSystem = createAuthFileSystem({
        accessSync,
        statSync,
        readFile: (p: string) => readFile(p, 'utf8'),
        writeFile: (p: string, c: string) => writeFile(p, c, 'utf8'),
        mkdir,
        readdir,
        chmod,
        rename,
      })

      const bucketDeps: BucketDependencies = {
        spawn,
        createWebSocket: serverEmulator.createWebSocket,
        discoverAgentCapabilities: async () => ({
          type: 'agent-capabilities',
          agents: [],
        }),
        setupKeypress: () => () => {},
        setupSignals: (onSignal: () => void) => {
          triggerShutdown = onSignal
          return () => {}
        },
        setupResize: () => () => {},
        getTerminalSize: () => ({ width: 80, height: 24 }),
        writeStdout: () => {},
        isTTY: false,
        sleep: realSleep,
        getReposDir: () => reposDir,
        auth: {
          createServer: async () => ({
            url: 'http://localhost',
            waitForCallback: async () => 'token',
            close: async () => {},
          }),
          openBrowser: () => {},
          getHomeDir: () => tmpdir(),
          fileSystem: authFileSystem,
        },
        run: fakeRun,
      }

      const stdoutLines: string[] = []
      const stderrLines: string[] = []

      const commandDeps: CommandDependencies = {
        arguments: [],
        context: {
          cwd: process.cwd(),
          stdout: stdoutLines.push.bind(stdoutLines),
          stderr: stderrLines.push.bind(stderrLines),
        },
        fileSystem,
        globScanner: { scan: async function* () {} },
        settings: { dustCommand: 'dust' },
      }

      const result = await stubEnv('DUST_UNATTENDED', undefined, () =>
        stubEnv('DUST_BUCKET_TOKEN', 'test-token', () =>
          bucketWorker(commandDeps, bucketDeps)
        )
      )

      // Classify captured messages by origin
      const capturedMessages = serverEmulator.messages.map(
        m => m.parsed
      ) as Array<Record<string, unknown>>
      const eventTypes = capturedMessages
        .filter(m => (m.event as Record<string, unknown>)?.type)
        .map(m => (m.event as Record<string, unknown>).type as string)

      // Agent events from the repository loop
      expect(eventTypes).toContain('agent-session-started')

      // Command events forwarded through the proxy, wrapped in command-event envelope
      expect(eventTypes).toContain('command-event')
      const commandEvents = capturedMessages
        .filter(
          m => (m.event as Record<string, unknown>)?.type === 'command-event'
        )
        .map(
          m =>
            (
              (m.event as Record<string, unknown>).commandEvent as Record<
                string,
                unknown
              >
            ).type as string
        )
      expect(commandEvents).toContain('check-started')
      expect(commandEvents).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^check-passed|check-failed$/),
        ])
      )

      // Auth token was forwarded
      expect(serverEmulator.token).toBe('test-token')

      // Clean shutdown
      expect(result.exitCode).toBe(0)
    } finally {
      rmSync(testRepoDir, { recursive: true, force: true })
      rmSync(reposDir, { recursive: true, force: true })
    }
  }, 60000)
})

/**
 * dust bucket <token> - Entry point for dustbucket connection
 *
 * Connects to dustbucket via WebSocket and spawns the container process.
 * The container manages dust loops across multiple repositories.
 *
 * Usage: dust bucket <token>
 * - token: Authentication token for dustbucket
 *
 * Exit: Press 'q' or Ctrl+C to gracefully shutdown
 */

import type { ChildProcess } from 'node:child_process'
import { spawn as nodeSpawn } from 'node:child_process'
import type { CommandDependencies, CommandResult } from '../types'

const DUSTBUCKET_WS_URL = 'wss://dustbucket.com/ws'
const INITIAL_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 30000

export interface BucketDependencies {
  spawn: typeof nodeSpawn
  createWebSocket: (url: string, token: string) => WebSocketLike
  setupKeypress: (onKey: (key: string) => void) => () => void
  setupSignals: (onSignal: () => void) => () => void
}

export interface WebSocketLike {
  onopen: (() => void) | null
  onclose: ((event: { code: number; reason: string }) => void) | null
  onerror: ((error: Error) => void) | null
  onmessage: ((event: { data: string }) => void) | null
  close: () => void
  send: (data: string) => void
  readyState: number
}

// WebSocket readyState constants
export const WS_CONNECTING = 0
export const WS_OPEN = 1
export const WS_CLOSING = 2
export const WS_CLOSED = 3

/* v8 ignore start - thin wrapper around native WebSocket */
function defaultCreateWebSocket(url: string, token: string): WebSocketLike {
  const ws = new WebSocket(url, {
    // @ts-expect-error - Bun's WebSocket accepts headers option
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return ws as unknown as WebSocketLike
}
/* v8 ignore stop */

/* v8 ignore start - thin wrapper around process stdin */
function defaultSetupKeypress(onKey: (key: string) => void): () => void {
  const stdin = process.stdin
  if (!stdin.isTTY) {
    return () => {}
  }

  stdin.setRawMode(true)
  stdin.resume()
  stdin.setEncoding('utf8')

  const handler = (key: string) => {
    onKey(key)
  }

  stdin.on('data', handler)

  return () => {
    stdin.removeListener('data', handler)
    stdin.setRawMode(false)
    stdin.pause()
  }
}
/* v8 ignore stop */

/* v8 ignore start - thin wrapper around process signals */
function defaultSetupSignals(onSignal: () => void): () => void {
  const handler = () => onSignal()

  process.on('SIGINT', handler)
  process.on('SIGTERM', handler)

  return () => {
    process.removeListener('SIGINT', handler)
    process.removeListener('SIGTERM', handler)
  }
}
/* v8 ignore stop */

export function createDefaultBucketDependencies(): BucketDependencies {
  return {
    spawn: nodeSpawn,
    createWebSocket: defaultCreateWebSocket,
    setupKeypress: defaultSetupKeypress,
    setupSignals: defaultSetupSignals,
  }
}

export interface BucketState {
  ws: WebSocketLike | null
  containerProcess: ChildProcess | null
  reconnectDelay: number
  reconnectTimer: ReturnType<typeof setTimeout> | null
  shuttingDown: boolean
}

export function createInitialState(): BucketState {
  return {
    ws: null,
    containerProcess: null,
    reconnectDelay: INITIAL_RECONNECT_DELAY_MS,
    reconnectTimer: null,
    shuttingDown: false,
  }
}

export function spawnContainer(
  token: string,
  cwd: string,
  dustCommand: string,
  spawn: typeof nodeSpawn
): ChildProcess {
  const commandParts = dustCommand.split(' ')
  const command = commandParts[0]
  const spawnArguments = [...commandParts.slice(1), 'bucket', 'container']

  return spawn(command, spawnArguments, {
    cwd,
    env: {
      ...process.env,
      DUST_API_TOKEN: token,
    },
    stdio: 'inherit',
  })
}

export function connectWebSocket(
  token: string,
  state: BucketState,
  bucketDependencies: BucketDependencies,
  context: CommandDependencies['context'],
  dustCommand: string,
  onShutdown: () => void
): void {
  if (state.shuttingDown) return

  context.stdout('🔌 Connecting to dustbucket...')

  const ws = bucketDependencies.createWebSocket(DUSTBUCKET_WS_URL, token)
  state.ws = ws

  ws.onopen = () => {
    context.stdout('✅ Connected to dustbucket')
    state.reconnectDelay = INITIAL_RECONNECT_DELAY_MS

    // Spawn the container process
    if (!state.containerProcess) {
      context.stdout('🚀 Spawning container process...')
      state.containerProcess = spawnContainer(
        token,
        context.cwd,
        dustCommand,
        bucketDependencies.spawn
      )

      state.containerProcess.on('exit', (code, signal) => {
        context.stdout(
          `📦 Container process exited (code: ${code}, signal: ${signal})`
        )
        state.containerProcess = null

        // If the container exits unexpectedly, shut down
        if (!state.shuttingDown) {
          context.stderr('Container process exited unexpectedly')
          onShutdown()
        }
      })
    }
  }

  ws.onclose = event => {
    context.stdout(
      `🔌 Disconnected from dustbucket (code: ${event.code}, reason: ${event.reason || 'none'})`
    )
    state.ws = null

    // Schedule reconnection
    if (!state.shuttingDown) {
      context.stdout(
        `⏳ Reconnecting in ${state.reconnectDelay / 1000} seconds...`
      )
      state.reconnectTimer = setTimeout(() => {
        connectWebSocket(
          token,
          state,
          bucketDependencies,
          context,
          dustCommand,
          onShutdown
        )
      }, state.reconnectDelay)

      // Exponential backoff
      state.reconnectDelay = Math.min(
        state.reconnectDelay * 2,
        MAX_RECONNECT_DELAY_MS
      )
    }
  }

  ws.onerror = error => {
    context.stderr(`WebSocket error: ${error.message}`)
  }

  ws.onmessage = event => {
    try {
      const message = JSON.parse(event.data)
      if (message.type === 'repository-list') {
        context.stdout(
          `📋 Received repository list (${message.repositories?.length ?? 0} repositories)`
        )
      }
    } catch {
      context.stderr(`Failed to parse WebSocket message: ${event.data}`)
    }
  }
}

export function shutdown(
  state: BucketState,
  context: CommandDependencies['context']
): void {
  if (state.shuttingDown) return
  state.shuttingDown = true

  context.stdout('🛑 Shutting down...')

  // Clear reconnect timer
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer)
    state.reconnectTimer = null
  }

  // Close WebSocket
  if (state.ws && state.ws.readyState === WS_OPEN) {
    state.ws.close()
    state.ws = null
  }

  // Kill container process
  if (state.containerProcess) {
    state.containerProcess.kill('SIGTERM')
    state.containerProcess = null
  }
}

export async function bucket(
  dependencies: CommandDependencies,
  bucketDeps: BucketDependencies = createDefaultBucketDependencies()
): Promise<CommandResult> {
  const { arguments: commandArgs, context, settings } = dependencies
  const token = commandArgs[0]

  if (!token) {
    context.stderr('Usage: dust bucket <token>')
    context.stderr('Missing required <token> argument')
    return { exitCode: 1 }
  }

  const state = createInitialState()
  let cleanupKeypress: (() => void) | undefined
  let cleanupSignals: (() => void) | undefined

  try {
    // Create a promise that resolves when shutdown is complete
    await new Promise<void>(resolve => {
      const doShutdown = () => {
        shutdown(state, context)
        resolve()
      }

      // Setup keypress handler for 'q' to quit
      cleanupKeypress = bucketDeps.setupKeypress(key => {
        if (key === 'q' || key === '\u0003') {
          // 'q' or Ctrl+C
          doShutdown()
        }
      })

      // Setup signal handlers
      cleanupSignals = bucketDeps.setupSignals(() => {
        doShutdown()
      })

      // Connect to WebSocket
      connectWebSocket(
        token,
        state,
        bucketDeps,
        context,
        settings.dustCommand,
        doShutdown
      )

      context.stdout('   Press q or Ctrl+C to exit')
    })
  } finally {
    // Clean up handlers
    cleanupKeypress?.()
    cleanupSignals?.()
  }

  context.stdout('👋 Goodbye!')
  return { exitCode: 0 }
}

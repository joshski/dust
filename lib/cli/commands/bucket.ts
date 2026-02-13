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
import {
  appendLogLine,
  createLogBuffer,
  createLogLine,
  type LogBuffer,
} from '../../bucket/log-buffer'
import {
  addRepository as addRepoToUI,
  createTerminalUIState,
  enterAlternateScreen,
  exitAlternateScreen,
  handleKeyInput,
  removeRepository as removeRepoFromUI,
  renderFrame,
  type TerminalUIState,
  updateDimensions,
} from '../../bucket/terminal-ui'
import type { CommandDependencies, CommandResult } from '../types'

const DUSTBUCKET_WS_URL = 'wss://dustbucket.com/ws'
const INITIAL_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 30000

export interface BucketDependencies {
  spawn: typeof nodeSpawn
  createWebSocket: (url: string, token: string) => WebSocketLike
  setupKeypress: (onKey: (key: string) => void) => () => void
  setupSignals: (onSignal: () => void) => () => void
  setupResize: (onResize: (width: number, height: number) => void) => () => void
  getTerminalSize: () => { width: number; height: number }
  writeStdout: (data: string) => void
  isTTY: boolean
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

/* v8 ignore start - thin wrapper around process stdout resize */
function defaultSetupResize(
  onResize: (width: number, height: number) => void
): () => void {
  const handler = () => {
    const { columns, rows } = process.stdout
    onResize(columns ?? 80, rows ?? 24)
  }

  process.stdout.on('resize', handler)

  return () => {
    process.stdout.removeListener('resize', handler)
  }
}
/* v8 ignore stop */

/* v8 ignore start - thin wrapper around process stdout */
function defaultGetTerminalSize(): { width: number; height: number } {
  return {
    width: process.stdout.columns ?? 80,
    height: process.stdout.rows ?? 24,
  }
}
/* v8 ignore stop */

/* v8 ignore start - thin wrapper around process stdout */
function defaultWriteStdout(data: string): void {
  process.stdout.write(data)
}
/* v8 ignore stop */

export function createDefaultBucketDependencies(): BucketDependencies {
  return {
    spawn: nodeSpawn,
    createWebSocket: defaultCreateWebSocket,
    setupKeypress: defaultSetupKeypress,
    setupSignals: defaultSetupSignals,
    setupResize: defaultSetupResize,
    getTerminalSize: defaultGetTerminalSize,
    writeStdout: defaultWriteStdout,
    isTTY: process.stdout.isTTY ?? false,
  }
}

export interface BucketState {
  ws: WebSocketLike | null
  containerProcess: ChildProcess | null
  reconnectDelay: number
  reconnectTimer: ReturnType<typeof setTimeout> | null
  shuttingDown: boolean
  ui: TerminalUIState
  logBuffers: Map<string, LogBuffer>
}

export function createInitialState(): BucketState {
  return {
    ws: null,
    containerProcess: null,
    reconnectDelay: INITIAL_RECONNECT_DELAY_MS,
    reconnectTimer: null,
    shuttingDown: false,
    ui: createTerminalUIState(),
    logBuffers: new Map(),
  }
}

export function spawnContainer(
  token: string,
  cwd: string,
  dustCommand: string,
  spawn: typeof nodeSpawn,
  usePipedStdio: boolean
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
    stdio: usePipedStdio ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })
}

/**
 * Parse a container output line to extract repository context.
 * Container output format includes repository prefixes like "[repo-name]".
 */
export function parseContainerOutput(line: string): {
  repository: string | null
  text: string
} {
  // Match patterns like "📦 Added repository: repo-name" or "[repo-name] text"
  const addedMatch = line.match(
    /(?:Added repository|Starting iteration for|Completed iteration for|stopped loop for|Error for):? (\S+)/
  )
  if (addedMatch) {
    return { repository: addedMatch[1], text: line }
  }

  // Match "[repo-name] text" format
  const bracketMatch = line.match(/^\[([^\]]+)\] (.*)$/)
  if (bracketMatch) {
    return { repository: bracketMatch[1], text: bracketMatch[2] }
  }

  return { repository: null, text: line }
}

/**
 * Handle output from the container process.
 */
export function handleContainerOutput(
  state: BucketState,
  line: string,
  stream: 'stdout' | 'stderr'
): void {
  const { repository, text } = parseContainerOutput(line)

  // Get or create log buffer for this repository (or 'system' for untagged output)
  const repoName = repository ?? 'system'

  let buffer = state.logBuffers.get(repoName)
  if (!buffer) {
    buffer = createLogBuffer()
    state.logBuffers.set(repoName, buffer)
    addRepoToUI(state.ui, repoName, buffer)
  }

  appendLogLine(buffer, createLogLine(text, stream))
}

/**
 * Handle repository list message from WebSocket.
 */
export function handleRepositoryList(
  state: BucketState,
  repositories: string[]
): void {
  const incoming = new Set(repositories)

  // Add new repositories
  for (const repoName of repositories) {
    if (!state.logBuffers.has(repoName)) {
      const buffer = createLogBuffer()
      state.logBuffers.set(repoName, buffer)
      addRepoToUI(state.ui, repoName, buffer)
    }
  }

  // Remove repositories that are no longer in the list
  // (but keep 'system' for container-level logs)
  for (const repoName of state.logBuffers.keys()) {
    if (repoName !== 'system' && !incoming.has(repoName)) {
      state.logBuffers.delete(repoName)
      removeRepoFromUI(state.ui, repoName)
    }
  }
}

export function connectWebSocket(
  token: string,
  state: BucketState,
  bucketDependencies: BucketDependencies,
  context: CommandDependencies['context'],
  dustCommand: string,
  onShutdown: () => void,
  useTUI: boolean
): void {
  if (state.shuttingDown) return

  if (!useTUI) {
    context.stdout('🔌 Connecting to dustbucket...')
  }

  const ws = bucketDependencies.createWebSocket(DUSTBUCKET_WS_URL, token)
  state.ws = ws

  ws.onopen = () => {
    if (!useTUI) {
      context.stdout('✅ Connected to dustbucket')
    }
    state.reconnectDelay = INITIAL_RECONNECT_DELAY_MS

    // Spawn the container process
    if (!state.containerProcess) {
      if (!useTUI) {
        context.stdout('🚀 Spawning container process...')
      }
      state.containerProcess = spawnContainer(
        token,
        context.cwd,
        dustCommand,
        bucketDependencies.spawn,
        useTUI
      )

      /* v8 ignore start - TUI mode requires actual piped streams */
      // If using TUI, capture container output
      if (useTUI && state.containerProcess.stdout) {
        state.containerProcess.stdout.setEncoding('utf8')
        let stdoutBuffer = ''
        state.containerProcess.stdout.on('data', (data: string) => {
          stdoutBuffer += data
          const lines = stdoutBuffer.split('\n')
          stdoutBuffer = lines.pop() ?? ''
          for (const line of lines) {
            if (line.trim()) {
              handleContainerOutput(state, line, 'stdout')
            }
          }
        })
      }

      if (useTUI && state.containerProcess.stderr) {
        state.containerProcess.stderr.setEncoding('utf8')
        let stderrBuffer = ''
        state.containerProcess.stderr.on('data', (data: string) => {
          stderrBuffer += data
          const lines = stderrBuffer.split('\n')
          stderrBuffer = lines.pop() ?? ''
          for (const line of lines) {
            if (line.trim()) {
              handleContainerOutput(state, line, 'stderr')
            }
          }
        })
      }
      /* v8 ignore stop */

      state.containerProcess.on('exit', (code, signal) => {
        if (!useTUI) {
          context.stdout(
            `📦 Container process exited (code: ${code}, signal: ${signal})`
          )
        }
        state.containerProcess = null

        // If the container exits unexpectedly, shut down
        if (!state.shuttingDown) {
          if (!useTUI) {
            context.stderr('Container process exited unexpectedly')
          }
          onShutdown()
        }
      })
    }
  }

  ws.onclose = event => {
    if (!useTUI) {
      context.stdout(
        `🔌 Disconnected from dustbucket (code: ${event.code}, reason: ${event.reason || 'none'})`
      )
    }
    state.ws = null

    // Schedule reconnection
    if (!state.shuttingDown) {
      if (!useTUI) {
        context.stdout(
          `⏳ Reconnecting in ${state.reconnectDelay / 1000} seconds...`
        )
      }
      state.reconnectTimer = setTimeout(() => {
        connectWebSocket(
          token,
          state,
          bucketDependencies,
          context,
          dustCommand,
          onShutdown,
          useTUI
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
    if (!useTUI) {
      context.stderr(`WebSocket error: ${error.message}`)
    }
  }

  ws.onmessage = event => {
    try {
      const message = JSON.parse(event.data)
      if (message.type === 'repository-list') {
        const repos = message.repositories ?? []
        if (!useTUI) {
          context.stdout(
            `📋 Received repository list (${repos.length} repositories)`
          )
        }
        handleRepositoryList(state, repos)
      }
    } catch {
      if (!useTUI) {
        context.stderr(`Failed to parse WebSocket message: ${event.data}`)
      }
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
  const useTUI = bucketDeps.isTTY

  /* v8 ignore start - TUI mode initialization */
  // Initialize terminal dimensions
  if (useTUI) {
    const { width, height } = bucketDeps.getTerminalSize()
    updateDimensions(state.ui, width, height)
  }
  /* v8 ignore stop */

  let cleanupKeypress: (() => void) | undefined
  let cleanupSignals: (() => void) | undefined
  let cleanupResize: (() => void) | undefined
  let renderInterval: ReturnType<typeof setInterval> | undefined

  try {
    /* v8 ignore start - TUI mode requires actual terminal */
    // Enter alternate screen for TUI mode
    if (useTUI) {
      bucketDeps.writeStdout(enterAlternateScreen())
    }
    /* v8 ignore stop */

    // Create a promise that resolves when shutdown is complete
    await new Promise<void>(resolve => {
      const doShutdown = () => {
        shutdown(state, context)
        resolve()
      }

      // Setup keypress handler
      cleanupKeypress = bucketDeps.setupKeypress(key => {
        /* v8 ignore start - TUI mode keypress handling */
        if (useTUI) {
          const shouldQuit = handleKeyInput(state.ui, key)
          if (shouldQuit) {
            doShutdown()
          }
        } else if (key === 'q' || key === '\u0003') {
          /* v8 ignore stop */
          doShutdown()
        }
      })

      // Setup signal handlers
      cleanupSignals = bucketDeps.setupSignals(() => {
        doShutdown()
      })

      /* v8 ignore start - TUI mode render loop */
      // Setup resize handler for TUI mode
      if (useTUI) {
        cleanupResize = bucketDeps.setupResize((width, height) => {
          updateDimensions(state.ui, width, height)
        })

        // Start render loop
        renderInterval = setInterval(() => {
          if (!state.shuttingDown) {
            bucketDeps.writeStdout(renderFrame(state.ui))
          }
        }, 100) // 10 FPS
      }
      /* v8 ignore stop */

      // Connect to WebSocket
      connectWebSocket(
        token,
        state,
        bucketDeps,
        context,
        settings.dustCommand,
        doShutdown,
        useTUI
      )

      if (!useTUI) {
        context.stdout('   Press q or Ctrl+C to exit')
      }
    })
  } finally {
    /* v8 ignore start - TUI mode cleanup */
    // Stop render loop
    if (renderInterval) {
      clearInterval(renderInterval)
    }

    // Exit alternate screen for TUI mode
    if (useTUI) {
      bucketDeps.writeStdout(exitAlternateScreen())
    }
    /* v8 ignore stop */

    // Clean up handlers
    cleanupKeypress?.()
    cleanupSignals?.()
    cleanupResize?.()
  }

  context.stdout('👋 Goodbye!')
  return { exitCode: 0 }
}

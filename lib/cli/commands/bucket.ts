/**
 * dust bucket - Entry point for dustbucket connection
 *
 * Connects to dustbucket via WebSocket, manages repository loops directly
 * in-process (single-process architecture). Each repository gets cloned,
 * synced, and runs dust loops concurrently.
 *
 * Usage: dust bucket
 * On first run, opens a browser to authenticate with dustbucket.
 * Credentials are stored in ~/.dust/credentials.json for subsequent runs.
 *
 * Environment:
 * - DUST_BUCKET_HOST: Override dustbucket host for auth (default: https://dustbucket.com)
 * - DUST_BUCKET_AGENT_CONNECT_URL: Override WebSocket URL (default: wss://dustbucket.com/agent/connect)
 *
 * Exit: Press 'q' or Ctrl+C to gracefully shutdown
 */

import { spawn as nodeSpawn } from 'node:child_process'
import { accessSync } from 'node:fs'
import { chmod, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { createServer as httpCreateServer } from 'node:http'
import { homedir, tmpdir } from 'node:os'
import {
  type AuthDependencies,
  authenticate,
  clearToken,
  loadStoredToken,
  storeToken,
} from '../../bucket/auth'
import {
  type BucketEmitFn,
  createEventMessageSender,
  formatBucketEvent,
  type SendEventFn,
  type WebSocketLike,
  WS_OPEN,
} from '../../bucket/events'
import {
  appendLogLine,
  createLogBuffer,
  createLogLine,
  type LogBuffer,
} from '../../bucket/log-buffer'
import {
  handleRepositoryList as handleRepositoryListFromRepo,
  parseRepository,
  type RepositoryDependencies,
  type RepositoryState,
  removeRepository,
} from '../../bucket/repository'
import {
  addRepository as addRepoToUI,
  createTerminalUIState,
  enterAlternateScreen,
  exitAlternateScreen,
  type HandleKeyInputOptions,
  handleKeyInput,
  removeRepository as removeRepoFromUI,
  renderFrame,
  type TerminalUIState,
  updateDimensions,
} from '../../bucket/terminal-ui'
import { run as claudeRun } from '../../claude/run'
import type { CommandDependencies, CommandResult, FileSystem } from '../types'

const DEFAULT_DUSTBUCKET_WS_URL = 'wss://dustbucket.com/agent/connect'
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
  sleep: (ms: number) => Promise<void>
  getTempDir: () => string
  auth: AuthDependencies
}

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

/* v8 ignore start - thin wrappers around native functions */
function defaultCreateServer(handler: (request: Request) => Response): {
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

function defaultOpenBrowser(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open'
  nodeSpawn(cmd, [url], { stdio: 'ignore', detached: true }).unref()
}
/* v8 ignore stop */

export function createDefaultBucketDependencies(): BucketDependencies {
  const authFileSystem: FileSystem = {
    exists: (path: string) => {
      try {
        accessSync(path)
        return true
      } catch {
        return false
      }
    },
    readFile: (path: string) => readFile(path, 'utf8'),
    writeFile: (path: string, content: string) =>
      writeFile(path, content, 'utf8'),
    mkdir: (path: string, options?: { recursive?: boolean }) =>
      mkdir(path, options).then(() => {}),
    readdir: (path: string) => readdir(path),
    chmod: (path: string, mode: number) => chmod(path, mode),
  }

  return {
    spawn: nodeSpawn,
    createWebSocket: defaultCreateWebSocket,
    setupKeypress: defaultSetupKeypress,
    setupSignals: defaultSetupSignals,
    setupResize: defaultSetupResize,
    getTerminalSize: defaultGetTerminalSize,
    writeStdout: defaultWriteStdout,
    isTTY: process.stdout.isTTY ?? false,
    /* v8 ignore start - thin wrappers around native functions */
    sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    getTempDir: () => tmpdir(),
    /* v8 ignore stop */
    auth: {
      createServer: defaultCreateServer,
      openBrowser: defaultOpenBrowser,
      getHomeDir: () => homedir(),
      fileSystem: authFileSystem,
    },
  }
}

export interface BucketState {
  ws: WebSocketLike | null
  repositories: Map<string, RepositoryState>
  reconnectDelay: number
  reconnectTimer: ReturnType<typeof setTimeout> | null
  shuttingDown: boolean
  sessionId: string
  emit: BucketEmitFn
  sendEvent: SendEventFn
  ui: TerminalUIState
  logBuffers: Map<string, LogBuffer>
}

export function createInitialState(): BucketState {
  const sessionId = crypto.randomUUID()
  const systemBuffer = createLogBuffer()
  const state: BucketState = {
    ws: null,
    repositories: new Map(),
    reconnectDelay: INITIAL_RECONNECT_DELAY_MS,
    reconnectTimer: null,
    shuttingDown: false,
    sessionId,
    emit: () => {},
    sendEvent: () => {},
    ui: createTerminalUIState(),
    logBuffers: new Map(),
  }
  state.sendEvent = createEventMessageSender(() => state.ws)
  // Register system buffer so connection messages appear in the "All" TUI view
  state.logBuffers.set('system', systemBuffer)
  addRepoToUI(state.ui, 'system', systemBuffer)
  return state
}

/**
 * Get the WebSocket URL, with env var override support.
 */
export function getWebSocketUrl(): string {
  return process.env.DUST_BUCKET_AGENT_CONNECT_URL || DEFAULT_DUSTBUCKET_WS_URL
}

/**
 * Build RepositoryDependencies from BucketDependencies.
 */
function toRepositoryDependencies(
  bucketDeps: BucketDependencies,
  fileSystem: FileSystem
): RepositoryDependencies {
  return {
    spawn: bucketDeps.spawn,
    run: claudeRun,
    fileSystem,
    sleep: bucketDeps.sleep,
    getTempDir: bucketDeps.getTempDir,
  }
}

/**
 * Eagerly sync UI tabs with a repository list from the server.
 * Called immediately on receiving a repository-list message so
 * tabs appear before the async clone work starts.
 */
export function syncUIWithRepoList(state: BucketState, repos: unknown[]): void {
  const incomingNames = new Set<string>()
  for (const data of repos) {
    const repo = parseRepository(data)
    if (repo) {
      incomingNames.add(repo.name)
      if (!state.ui.repositories.includes(repo.name)) {
        let buffer = state.logBuffers.get(repo.name)
        if (!buffer) {
          buffer = createLogBuffer()
          state.logBuffers.set(repo.name, buffer)
        }
        addRepoToUI(state.ui, repo.name, buffer, repo.url)
      } else if (repo.url) {
        // Update URL if repository already exists but URL changed
        state.ui.repositoryUrls.set(repo.name, repo.url)
      }
    }
  }

  // Remove repos no longer in the list from UI
  for (const name of [...state.ui.repositories]) {
    if (name !== 'system' && !incomingNames.has(name)) {
      state.logBuffers.delete(name)
      removeRepoFromUI(state.ui, name)
    }
  }
}

/**
 * Sync agent statuses from RepositoryState to TUI state.
 * Called on each render frame to reflect status changes from agent events.
 */
export function syncAgentStatuses(state: BucketState): void {
  for (const [name, repoState] of state.repositories) {
    state.ui.agentStatuses.set(name, repoState.agentStatus)
  }
}

/**
 * Sync TUI state with current repositories.
 * Called after async clone/loop work to reconcile any differences
 * (e.g. repos that failed to clone get removed from UI).
 */
export function syncTUI(state: BucketState): void {
  const currentUIRepos = new Set(state.ui.repositories)
  const currentRepos = new Set(state.repositories.keys())

  // Always sync buffer references and agent statuses from RepositoryState → UI
  for (const [name, repoState] of state.repositories) {
    state.logBuffers.set(name, repoState.logBuffer)
    addRepoToUI(state.ui, name, repoState.logBuffer)
    state.ui.agentStatuses.set(name, repoState.agentStatus)
  }

  // Remove repos from UI that are no longer tracked
  for (const name of currentUIRepos) {
    if (name !== 'system' && !currentRepos.has(name)) {
      state.logBuffers.delete(name)
      removeRepoFromUI(state.ui, name)
    }
  }
}

/**
 * Log a message to the appropriate output.
 * In TUI mode, appends to the system log buffer (visible under "All").
 * In non-TUI mode, writes to context stdout/stderr.
 */
export function logMessage(
  state: BucketState,
  context: CommandDependencies['context'],
  useTUI: boolean,
  message: string,
  stream: 'stdout' | 'stderr' = 'stdout'
): void {
  if (useTUI) {
    const systemBuffer = state.logBuffers.get('system')
    if (!systemBuffer) return
    appendLogLine(systemBuffer, createLogLine(message, stream))
  } else if (stream === 'stderr') {
    context.stderr(message)
  } else {
    context.stdout(message)
  }
}

/**
 * Wrap a context so stdout/stderr route through the TUI system log buffer.
 */
export function createTUIContext(
  state: BucketState,
  context: CommandDependencies['context'],
  useTUI: boolean
): CommandDependencies['context'] {
  if (!useTUI) return context
  return {
    ...context,
    stdout: (message: string) =>
      logMessage(state, context, true, message, 'stdout'),
    stderr: (message: string) =>
      logMessage(state, context, true, message, 'stderr'),
  }
}

/**
 * Attempt initial WebSocket connection.
 * Resolves with the connected WebSocket, or rejects on error/close.
 */
export function waitForConnection(
  token: string,
  bucketDeps: BucketDependencies
): Promise<WebSocketLike> {
  const wsUrl = getWebSocketUrl()
  const ws = bucketDeps.createWebSocket(wsUrl, token)

  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve(ws)
    ws.onerror = error => reject(new Error(error.message))
    ws.onclose = event =>
      reject(new Error(`Connection closed (code ${event.code})`))
  })
}

export function connectWebSocket(
  token: string,
  state: BucketState,
  bucketDependencies: BucketDependencies,
  context: CommandDependencies['context'],
  fileSystem: FileSystem,
  useTUI: boolean,
  connectedWs?: WebSocketLike
): void {
  if (state.shuttingDown) return

  const wsUrl = getWebSocketUrl()

  let ws: WebSocketLike
  if (connectedWs) {
    ws = connectedWs
    state.ws = ws
    state.emit({ type: 'bucket.connected' })
    logMessage(
      state,
      context,
      useTUI,
      formatBucketEvent({ type: 'bucket.connected' })
    )
    state.reconnectDelay = INITIAL_RECONNECT_DELAY_MS
  } else {
    logMessage(state, context, useTUI, `Connecting to ${wsUrl}...`)
    ws = bucketDependencies.createWebSocket(wsUrl, token)
    state.ws = ws

    ws.onopen = () => {
      state.emit({ type: 'bucket.connected' })
      logMessage(
        state,
        context,
        useTUI,
        formatBucketEvent({ type: 'bucket.connected' })
      )
      state.reconnectDelay = INITIAL_RECONNECT_DELAY_MS
    }
  }

  ws.onclose = event => {
    const disconnectEvent = {
      type: 'bucket.disconnected' as const,
      code: event.code,
      reason: event.reason || 'none',
    }
    state.emit(disconnectEvent)
    logMessage(state, context, useTUI, formatBucketEvent(disconnectEvent))
    state.ws = null

    // Schedule reconnection
    if (!state.shuttingDown) {
      logMessage(
        state,
        context,
        useTUI,
        `Reconnecting in ${state.reconnectDelay / 1000} seconds...`
      )
      state.reconnectTimer = setTimeout(() => {
        connectWebSocket(
          token,
          state,
          bucketDependencies,
          context,
          fileSystem,
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
    logMessage(
      state,
      context,
      useTUI,
      `WebSocket error: ${error.message}`,
      'stderr'
    )
  }

  ws.onmessage = event => {
    try {
      const message = JSON.parse(event.data)
      if (message.type === 'repository-list') {
        const repos = message.repositories ?? []
        logMessage(
          state,
          context,
          useTUI,
          `Received repository list (${repos.length} repositories)`
        )
        // Eagerly add repos to UI so tabs appear before cloning finishes
        syncUIWithRepoList(state, repos)
        const repoDeps = toRepositoryDependencies(
          bucketDependencies,
          fileSystem
        )
        const repoContext = createTUIContext(state, context, useTUI)
        handleRepositoryListFromRepo(repos, state, repoDeps, repoContext)
          .then(() => syncTUI(state))
          .catch(error => {
            logMessage(
              state,
              context,
              useTUI,
              `Failed to handle repository list: ${error.message}`,
              'stderr'
            )
          })
      }
    } catch {
      logMessage(
        state,
        context,
        useTUI,
        `Failed to parse WebSocket message: ${event.data}`,
        'stderr'
      )
    }
  }
}

export async function shutdown(
  state: BucketState,
  bucketDeps: BucketDependencies,
  context: CommandDependencies['context']
): Promise<void> {
  if (state.shuttingDown) return
  state.shuttingDown = true

  context.stdout('Shutting down...')

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

  // Stop all repository loops
  for (const repoState of state.repositories.values()) {
    repoState.stopRequested = true
  }

  // Wait for all loops to finish
  const loopPromises = Array.from(state.repositories.values())
    .map(rs => rs.loopPromise)
    .filter((p): p is Promise<void> => p !== null)

  await Promise.all(loopPromises.map(p => p.catch(() => {})))

  // Clean up all repository directories
  for (const repoState of state.repositories.values()) {
    await removeRepository(repoState.path, bucketDeps.spawn, context)
  }

  state.repositories.clear()
}

/**
 * TUI lifecycle handle returned by setupTUI.
 * Call cleanup() to tear down the alternate screen, render loop, and resize handler.
 */
export interface TUIHandle {
  cleanup: () => void
}

/**
 * Initialize the TUI: enter alternate screen, start the render loop,
 * and subscribe to resize events.
 *
 * Returns a handle whose cleanup() restores the terminal to normal.
 */
export function setupTUI(
  state: BucketState,
  bucketDeps: BucketDependencies
): TUIHandle {
  const { width, height } = bucketDeps.getTerminalSize()
  updateDimensions(state.ui, width, height)

  bucketDeps.writeStdout(enterAlternateScreen())

  const cleanupResize = bucketDeps.setupResize((w, h) => {
    updateDimensions(state.ui, w, h)
  })

  const renderInterval = setInterval(() => {
    if (!state.shuttingDown) {
      syncAgentStatuses(state)
      bucketDeps.writeStdout(renderFrame(state.ui))
    }
  }, 100)

  return {
    cleanup: () => {
      clearInterval(renderInterval)
      bucketDeps.writeStdout(exitAlternateScreen())
      cleanupResize()
    },
  }
}

/**
 * Create a keypress handler appropriate for the current mode.
 * In TUI mode, routes all keys through handleKeyInput.
 * In non-TUI mode, only responds to 'q' and Ctrl+C.
 */
export function createKeypressHandler(
  useTUI: boolean,
  state: BucketState,
  onQuit: () => void,
  options?: HandleKeyInputOptions
): (key: string) => void {
  if (useTUI) {
    return (key: string) => {
      const shouldQuit = handleKeyInput(state.ui, key, options)
      if (shouldQuit) onQuit()
    }
  }
  return (key: string) => {
    if (key === 'q' || key === '\u0003') onQuit()
  }
}

async function resolveToken(
  commandArgs: string[],
  authDeps: AuthDependencies,
  context: CommandDependencies['context']
): Promise<string | null> {
  // 1. Explicit token argument (backward compat)
  if (commandArgs[0]) {
    return commandArgs[0]
  }

  // 2. Stored credential
  const stored = await loadStoredToken(
    authDeps.fileSystem,
    authDeps.getHomeDir()
  )
  if (stored) {
    return stored
  }

  // 3. Browser auth flow
  context.stdout('Opening browser to authenticate with dustbucket...')
  try {
    const token = await authenticate(authDeps)
    await storeToken(authDeps.fileSystem, authDeps.getHomeDir(), token)
    context.stdout('Authenticated successfully')
    return token
  } catch (error) {
    context.stderr(`Authentication failed: ${(error as Error).message}`)
    return null
  }
}

export async function bucket(
  dependencies: CommandDependencies,
  bucketDeps: BucketDependencies = createDefaultBucketDependencies()
): Promise<CommandResult> {
  const { arguments: commandArgs, context, fileSystem } = dependencies

  const token = await resolveToken(commandArgs, bucketDeps.auth, context)
  if (!token) {
    return { exitCode: 1 }
  }

  // Attempt initial connection before entering TUI
  const wsUrl = getWebSocketUrl()
  context.stdout(`Connecting to ${wsUrl}...`)

  let initialWs: WebSocketLike
  try {
    initialWs = await waitForConnection(token, bucketDeps)
  } catch (error) {
    // On 401-like failures, clear stored credential and suggest re-auth
    if (
      (error as Error).message.includes('1008') ||
      (error as Error).message.includes('401')
    ) {
      context.stderr('Token rejected. Clearing stored credentials...')
      await clearToken(bucketDeps.auth.fileSystem, bucketDeps.auth.getHomeDir())
      context.stderr('Run `dust bucket` again to re-authenticate.')
    } else {
      context.stderr(`Failed to connect: ${(error as Error).message}`)
    }
    return { exitCode: 1 }
  }

  context.stdout('Connected')

  const state = createInitialState()
  const useTUI = bucketDeps.isTTY

  // Set connected host for TUI header
  try {
    state.ui.connectedHost = new URL(wsUrl).hostname
  } catch {
    state.ui.connectedHost = wsUrl
  }

  let tuiHandle: TUIHandle | undefined
  let cleanupKeypress: (() => void) | undefined
  let cleanupSignals: (() => void) | undefined

  try {
    if (useTUI) {
      tuiHandle = setupTUI(state, bucketDeps)
    }

    await new Promise<void>(resolve => {
      const doShutdown = async () => {
        await shutdown(state, bucketDeps, context)
        resolve()
      }

      // Setup keypress handler
      const onKey = createKeypressHandler(
        useTUI,
        state,
        () => {
          doShutdown()
        },
        { openBrowser: bucketDeps.auth.openBrowser }
      )
      cleanupKeypress = bucketDeps.setupKeypress(onKey)

      // Setup signal handlers
      cleanupSignals = bucketDeps.setupSignals(() => {
        doShutdown()
      })

      // Set up WebSocket handlers with the already-connected ws
      connectWebSocket(
        token,
        state,
        bucketDeps,
        context,
        fileSystem,
        useTUI,
        initialWs
      )

      if (!useTUI) {
        context.stdout('   Press q or Ctrl+C to exit')
      }
    })
  } finally {
    tuiHandle?.cleanup()
    cleanupKeypress?.()
    cleanupSignals?.()
  }

  context.stdout('Goodbye!')
  return { exitCode: 0 }
}

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
 * - DUST_BUCKET_TOKEN: Authentication token (takes precedence over stored credential)
 * - DUST_BUCKET_HOST: Override dustbucket host for auth (default: https://dustbucket.com)
 * - DUST_BUCKET_AGENT_CONNECT_URL: Override WebSocket URL (default: wss://dustbucket.com/agent/connect)
 *
 * Exit: Press 'q' or Ctrl+C to gracefully shutdown
 */

import { spawn as nodeSpawn } from 'node:child_process'
import { accessSync, statSync } from 'node:fs'
import { chmod, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import {
  type AuthDependencies,
  authenticate,
  clearToken,
  loadStoredToken,
  storeToken,
} from '../../bucket/auth'
import { createLocalServer, openBrowser } from '../../bucket/auth-server'
import {
  type ConnectionLifecycleState,
  type Effect,
  handleClose,
  handleError,
  handleInvalidMessageFormat,
  handleKeypress,
  handleMessageParseError,
  handleOpen,
  handleServerMessage,
  INITIAL_RECONNECT_DELAY_MS,
  type KeypressHandlerState,
  type MessageHandlerState,
} from '../../bucket/bucket-state'
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
import { getReposDir } from '../../bucket/paths'
import {
  handleRepositoryList as handleRepositoryListFromRepo,
  type RepositoryDependencies,
  type RepositoryState,
  removeRepository,
  startRepositoryLoop,
} from '../../bucket/repository'
import {
  parseServerMessage,
  type RepositoryListItem,
  type ToolDefinition,
} from '../../bucket/server-messages'
import {
  addRepository as addRepoToUI,
  createTerminalUIState,
  enterAlternateScreen,
  exitAlternateScreen,
  getLogAreaHeight,
  removeRepository as removeRepoFromUI,
  renderFrame,
  scrollDown,
  scrollToBottom,
  scrollToTop,
  scrollUp,
  selectNext,
  selectPrevious,
  type TerminalUIState,
  updateDimensions,
} from '../../bucket/terminal-ui'
import { run as claudeRun } from '../../claude/run'
import { createLogger, enableFileLogs } from '../../logging'
import { isUnattended } from '../../session'
import type { CommandDependencies, CommandResult, FileSystem } from '../types'

const log = createLogger('dust:cli:commands:bucket')

const DEFAULT_DUSTBUCKET_WS_URL = 'wss://dustbucket.com/agent/connect'

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
  getReposDir: () => string
  auth: AuthDependencies
}

/**
 * Dependencies for createAuthFileSystem - allows injection of low-level fs operations
 */
export interface AuthFileSystemDependencies {
  accessSync: (path: string) => void
  statSync: (path: string) => {
    isDirectory: () => boolean
    birthtimeMs: number
  }
  readFile: (path: string, encoding: 'utf8') => Promise<string>
  writeFile: (path: string, content: string, encoding: 'utf8') => Promise<void>
  mkdir: (
    path: string,
    options?: { recursive?: boolean }
  ) => Promise<string | undefined>
  readdir: (path: string) => Promise<string[]>
  chmod: (path: string, mode: number) => Promise<void>
  rename: (oldPath: string, newPath: string) => Promise<void>
}

/**
 * Creates a FileSystem implementation for auth operations.
 * The exists, isDirectory, and getFileCreationTime methods wrap sync fs operations
 * with try/catch to convert exceptions to boolean/default values.
 */
export function createAuthFileSystem(
  dependencies: AuthFileSystemDependencies
): FileSystem {
  return {
    exists: (path: string) => {
      try {
        dependencies.accessSync(path)
        return true
      } catch {
        return false
      }
    },
    isDirectory: (path: string) => {
      try {
        return dependencies.statSync(path).isDirectory()
      } catch {
        return false
      }
    },
    getFileCreationTime: (path: string) =>
      dependencies.statSync(path).birthtimeMs,
    readFile: (path: string) => dependencies.readFile(path, 'utf8'),
    writeFile: (path: string, content: string) =>
      dependencies.writeFile(path, content, 'utf8'),
    mkdir: (path: string, options?: { recursive?: boolean }) =>
      dependencies.mkdir(path, options).then(() => {}),
    readdir: (path: string) => dependencies.readdir(path),
    chmod: (path: string, mode: number) => dependencies.chmod(path, mode),
    rename: (oldPath: string, newPath: string) =>
      dependencies.rename(oldPath, newPath),
  }
}

/* v8 ignore start - native wrappers: WebSocket, stdin, signals, resize, stdout */
function defaultCreateWebSocket(url: string, token: string): WebSocketLike {
  const ws = new WebSocket(url, {
    // @ts-expect-error - Bun's WebSocket accepts headers option
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return ws as unknown as WebSocketLike
}

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

function defaultSetupSignals(onSignal: () => void): () => void {
  const handler = () => onSignal()

  process.on('SIGINT', handler)
  process.on('SIGTERM', handler)

  return () => {
    process.removeListener('SIGINT', handler)
    process.removeListener('SIGTERM', handler)
  }
}

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

function defaultGetTerminalSize(): { width: number; height: number } {
  return {
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24,
  }
}

function defaultWriteStdout(data: string): void {
  process.stdout.write(data)
}

export function createDefaultBucketDependencies(): BucketDependencies {
  const authFileSystem = createAuthFileSystem({
    accessSync,
    statSync,
    readFile,
    writeFile,
    mkdir,
    readdir,
    chmod,
    rename: (oldPath, newPath) =>
      import('node:fs/promises').then(mod => mod.rename(oldPath, newPath)),
  })

  return {
    spawn: nodeSpawn,
    createWebSocket: defaultCreateWebSocket,
    setupKeypress: defaultSetupKeypress,
    setupSignals: defaultSetupSignals,
    setupResize: defaultSetupResize,
    getTerminalSize: defaultGetTerminalSize,
    writeStdout: defaultWriteStdout,
    isTTY: process.stdout.isTTY ?? false,
    sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    getReposDir: () => getReposDir(process.env, homedir()),
    auth: {
      createServer: createLocalServer,
      openBrowser: openBrowser,
      getHomeDir: () => homedir(),
      fileSystem: authFileSystem,
    },
  }
}
/* v8 ignore stop */

interface BucketState {
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
  tools: ToolDefinition[]
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
    tools: [],
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
  fileSystem: FileSystem,
  state: BucketState
): RepositoryDependencies {
  return {
    spawn: bucketDeps.spawn,
    run: claudeRun,
    fileSystem,
    sleep: bucketDeps.sleep,
    getReposDir: bucketDeps.getReposDir,
    getTools: () => state.tools,
  }
}

function ensureRepositoryLoopRunning(
  repoState: RepositoryState,
  state: BucketState,
  repoDeps: RepositoryDependencies,
  context: CommandDependencies['context'],
  useTUI: boolean
): void {
  // If wakeUp is set, the loop is already alive and waiting for tasks.
  if (repoState.loopPromise || repoState.wakeUp || repoState.stopRequested) {
    log(`loop already running/waiting for ${repoState.repository.name}`)
    return
  }

  logMessage(
    state,
    context,
    useTUI,
    `Repository loop not running for ${repoState.repository.name}; restarting`
  )
  startRepositoryLoop(repoState, repoDeps, state.sendEvent, state.sessionId)
}

function signalTaskAvailable(
  repoState: RepositoryState,
  state: BucketState,
  repoDeps: RepositoryDependencies,
  context: CommandDependencies['context'],
  useTUI: boolean
): void {
  log(`task-available signal for ${repoState.repository.name}`)
  ensureRepositoryLoopRunning(repoState, state, repoDeps, context, useTUI)
  if (repoState.wakeUp) {
    log(`waking loop for ${repoState.repository.name}`)
    repoState.wakeUp()
  } else {
    log(`marking task pending for ${repoState.repository.name} (loop busy)`)
    repoState.taskAvailablePending = true
  }
}

/**
 * Eagerly sync UI tabs with a repository list from the server.
 * Called immediately on receiving a repository-list message so
 * tabs appear before the async clone work starts.
 */
export function syncUIWithRepoList(
  state: BucketState,
  repos: RepositoryListItem[]
): void {
  const incomingNames = new Set<string>()
  for (const repo of repos) {
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
 * Handle successful completion of repository list processing.
 * Syncs TUI state and wakes repos that have tasks waiting.
 */
export function handleRepositoryListSuccess(
  state: BucketState,
  repos: RepositoryListItem[],
  repoDeps: RepositoryDependencies,
  context: CommandDependencies['context'],
  useTUI: boolean
): void {
  syncTUI(state)
  for (const repoData of repos) {
    if (repoData.hasTask) {
      const repoState = state.repositories.get(repoData.name)
      if (repoState) {
        signalTaskAvailable(repoState, state, repoDeps, context, useTUI)
      }
    }
  }
}

/**
 * Handle error during repository list processing.
 * Logs the error message to the appropriate output.
 */
export function handleRepositoryListError(
  state: BucketState,
  context: CommandDependencies['context'],
  useTUI: boolean,
  error: Error
): void {
  logMessage(
    state,
    context,
    useTUI,
    `Failed to handle repository list: ${error.message}`,
    'stderr'
  )
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
      const lifecycleState: ConnectionLifecycleState = {
        reconnectDelay: state.reconnectDelay,
        shuttingDown: state.shuttingDown,
      }
      const result = handleOpen(lifecycleState)
      state.reconnectDelay = result.state.reconnectDelay
      executeLifecycleEffects(
        result.effects,
        { state, context, useTUI, bucketDependencies, fileSystem },
        token
      )
    }
  }

  ws.onclose = event => {
    const disconnectEvent = {
      type: 'bucket.disconnected' as const,
      code: event.code,
      reason: event.reason || 'none',
    }
    state.emit(disconnectEvent)
    state.ws = null

    const lifecycleState: ConnectionLifecycleState = {
      reconnectDelay: state.reconnectDelay,
      shuttingDown: state.shuttingDown,
    }
    const result = handleClose(lifecycleState, event.code, event.reason || '')
    state.reconnectDelay = result.state.reconnectDelay
    executeLifecycleEffects(
      result.effects,
      { state, context, useTUI, bucketDependencies, fileSystem },
      token
    )
  }

  ws.onerror = error => {
    const lifecycleState: ConnectionLifecycleState = {
      reconnectDelay: state.reconnectDelay,
      shuttingDown: state.shuttingDown,
    }
    const result = handleError(lifecycleState, error.message)
    executeLifecycleEffects(
      result.effects,
      { state, context, useTUI, bucketDependencies, fileSystem },
      token
    )
  }

  ws.onmessage = event => {
    let rawData: unknown
    try {
      rawData = JSON.parse(event.data)
    } catch {
      const result = handleMessageParseError(event.data)
      executeEffects(result.effects, {
        state,
        context,
        useTUI,
        bucketDependencies,
        fileSystem,
      })
      return
    }

    const message = parseServerMessage(rawData)
    if (!message) {
      const result = handleInvalidMessageFormat(event.data)
      executeEffects(result.effects, {
        state,
        context,
        useTUI,
        bucketDependencies,
        fileSystem,
      })
      return
    }

    // Build plain-object projection of state for pure handler
    const handlerState: MessageHandlerState = {
      repositoryNames: Array.from(state.repositories.keys()),
    }

    const result = handleServerMessage(handlerState, message)
    executeEffects(result.effects, {
      state,
      context,
      useTUI,
      bucketDependencies,
      fileSystem,
    })
  }
}

/**
 * Dependencies needed to execute effects from pure message handlers.
 */
interface EffectExecutionDeps {
  state: BucketState
  context: CommandDependencies['context']
  useTUI: boolean
  bucketDependencies: BucketDependencies
  fileSystem: FileSystem
}

/**
 * Execute effects returned by pure message handlers.
 * This is the "imperative shell" that interprets effect descriptions.
 */
function executeEffects(
  effects: Effect[],
  dependencies: EffectExecutionDeps
): void {
  const { state, context, useTUI, bucketDependencies, fileSystem } =
    dependencies

  for (const effect of effects) {
    switch (effect.type) {
      case 'log':
        logMessage(state, context, useTUI, effect.message, effect.stream)
        break

      case 'debugLog':
        log(effect.message)
        break

      case 'syncUI':
        syncUIWithRepoList(state, effect.repositories)
        break

      case 'handleRepositoryList': {
        const repoDeps = toRepositoryDependencies(
          bucketDependencies,
          fileSystem,
          state
        )
        const repoContext = createTUIContext(state, context, useTUI)
        const repos = effect.repositories
        handleRepositoryListFromRepo(repos, state, repoDeps, repoContext)
          .then(() =>
            handleRepositoryListSuccess(state, repos, repoDeps, context, useTUI)
          )
          .catch((error: Error) =>
            handleRepositoryListError(state, context, useTUI, error)
          )
        break
      }

      case 'signalTaskAvailable': {
        const repoDeps = toRepositoryDependencies(
          bucketDependencies,
          fileSystem,
          state
        )
        const repoState = state.repositories.get(effect.repositoryName)
        if (repoState) {
          signalTaskAvailable(repoState, state, repoDeps, context, useTUI)
        }
        break
      }

      case 'storeToolDefinitions':
        state.tools = effect.tools
        break

      case 'scheduleReconnect':
        // Requires token to be available - this is handled by connectWebSocket wrapper
        break
    }
  }
}

/**
 * Execute lifecycle effects, including scheduleReconnect which needs access to
 * the token and can schedule a reconnection.
 */
function executeLifecycleEffects(
  effects: Effect[],
  dependencies: EffectExecutionDeps,
  token: string
): void {
  const { state, context, useTUI, bucketDependencies, fileSystem } =
    dependencies

  for (const effect of effects) {
    switch (effect.type) {
      case 'log':
        logMessage(state, context, useTUI, effect.message, effect.stream)
        break

      case 'scheduleReconnect':
        state.reconnectTimer = setTimeout(() => {
          connectWebSocket(
            token,
            state,
            bucketDependencies,
            context,
            fileSystem,
            useTUI
          )
        }, effect.delayMs)
        break
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

  log('shutdown initiated')
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
    repoState.cancelCurrentIteration?.()
    repoState.wakeUp?.()
  }

  // Wait for all loops to finish
  const loopPromises = Array.from(state.repositories.values())
    .map(rs => rs.loopPromise)
    .filter((p): p is Promise<void> => p !== null)

  const results = await Promise.allSettled(loopPromises)
  for (const result of results) {
    if (result.status === 'rejected') {
      context.stderr(`Repository loop failed: ${result.reason}`)
    }
  }

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
interface TUIHandle {
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
 * Options for createKeypressHandler.
 */
interface KeypressHandlerOptions {
  /** Callback to open a URL in the browser */
  openBrowser?: (url: string) => void
}

/**
 * Create a projection of UI state for the pure keypress handler.
 */
function createKeypressHandlerState(ui: TerminalUIState): KeypressHandlerState {
  const repositoryUrls: Record<string, string> = {}
  for (const [name, url] of ui.repositoryUrls) {
    repositoryUrls[name] = url
  }
  return {
    selectedIndex: ui.selectedIndex,
    repositories: ui.repositories,
    repositoryUrls,
  }
}

/**
 * Execute keypress effects on UI state.
 * This is the imperative shell that interprets pure handler results.
 */
function executeKeypressEffects(
  ui: TerminalUIState,
  effects: Effect[],
  onQuit: () => void,
  options?: KeypressHandlerOptions
): void {
  for (const effect of effects) {
    switch (effect.type) {
      case 'quit':
        onQuit()
        break
      case 'openBrowser':
        if (options?.openBrowser) {
          options.openBrowser(effect.url)
        }
        break
      case 'selectNext':
        selectNext(ui)
        ui.scrollOffset = 0
        ui.autoScroll = true
        break
      case 'selectPrevious':
        selectPrevious(ui)
        ui.scrollOffset = 0
        ui.autoScroll = true
        break
      case 'scroll':
        switch (effect.direction) {
          case 'up':
            scrollUp(ui, 1)
            break
          case 'down':
            scrollDown(ui, 1)
            break
          case 'pageUp':
            scrollUp(ui, getLogAreaHeight(ui))
            break
          case 'pageDown':
            scrollDown(ui, getLogAreaHeight(ui))
            break
          case 'top':
            scrollToTop(ui)
            break
          case 'bottom':
            scrollToBottom(ui)
            break
        }
        break
    }
  }
}

/**
 * Create a keypress handler appropriate for the current mode.
 * In TUI mode, routes all keys through the pure handleKeypress handler.
 * In non-TUI mode, only responds to 'q' and Ctrl+C.
 */
export function createKeypressHandler(
  useTUI: boolean,
  state: BucketState,
  onQuit: () => void,
  options?: KeypressHandlerOptions
): (key: string) => void {
  if (useTUI) {
    return (key: string) => {
      const keypressState = createKeypressHandlerState(state.ui)
      const { effects } = handleKeypress(keypressState, key)
      executeKeypressEffects(state.ui, effects, onQuit, options)
    }
  }
  return (key: string) => {
    // Non-TUI mode: use pure handler for consistent quit detection
    const keypressState = createKeypressHandlerState(state.ui)
    const { effects } = handleKeypress(keypressState, key)
    // Only handle quit effects in non-TUI mode
    for (const effect of effects) {
      if (effect.type === 'quit') {
        onQuit()
        break
      }
    }
  }
}

async function resolveToken(
  authDeps: AuthDependencies,
  context: CommandDependencies['context']
): Promise<string | null> {
  // 1. Environment variable
  const envToken = process.env.DUST_BUCKET_TOKEN
  if (envToken) {
    return envToken
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

export async function bucketWorker(
  dependencies: CommandDependencies,
  bucketDeps: BucketDependencies = createDefaultBucketDependencies()
): Promise<CommandResult> {
  enableFileLogs('bucket')
  const { context, fileSystem } = dependencies

  if (isUnattended()) {
    context.stderr(
      'dust bucket cannot run inside an unattended session (DUST_UNATTENDED is set)'
    )
    return { exitCode: 1 }
  }

  const token = await resolveToken(bucketDeps.auth, context)
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

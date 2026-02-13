/**
 * dust bucket container - Container process for managing dust loops
 *
 * Manages dust loops across multiple repositories. Receives repository lists
 * from dustbucket via WebSocket and runs concurrent async loops for each.
 *
 * Environment: Expects DUST_API_TOKEN to be set
 *
 * Each repository loop:
 * 1. git pull to sync with remote
 * 2. Check for tasks using the repo's dustCommand
 * 3. If tasks exist, invoke the repo's dustCommand
 * 4. If no tasks, sleep before checking again
 */

import { spawn as nodeSpawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { CommandDependencies, CommandResult, FileSystem } from '../types'
import { type WebSocketLike, WS_OPEN } from './bucket'

// Bucket-specific event types
export interface BucketConnectedEvent {
  type: 'bucket.connected'
}

export interface BucketDisconnectedEvent {
  type: 'bucket.disconnected'
  code: number
  reason: string
}

export interface BucketRepositoryAddedEvent {
  type: 'bucket.repository_added'
  repository: string
}

export interface BucketRepositoryRemovedEvent {
  type: 'bucket.repository_removed'
  repository: string
}

export interface BucketIterationStartedEvent {
  type: 'bucket.iteration_started'
  repository: string
}

export interface BucketIterationCompletedEvent {
  type: 'bucket.iteration_completed'
  repository: string
  success: boolean
  error?: string
}

export interface BucketErrorEvent {
  type: 'bucket.error'
  repository?: string
  error: string
}

export type BucketEvent =
  | BucketConnectedEvent
  | BucketDisconnectedEvent
  | BucketRepositoryAddedEvent
  | BucketRepositoryRemovedEvent
  | BucketIterationStartedEvent
  | BucketIterationCompletedEvent
  | BucketErrorEvent

export interface BucketEventPayload {
  type: BucketEvent['type']
  timestamp: string
  sessionId: string
  sequence: number
  repository?: string
  details?: unknown
}

export type BucketEmitFn = (event: BucketEvent) => void

// Format event for console output
export function formatBucketEvent(event: BucketEvent): string {
  switch (event.type) {
    case 'bucket.connected':
      return '✅ Container connected to dustbucket'
    case 'bucket.disconnected':
      return `🔌 Container disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`
    case 'bucket.repository_added':
      return `📦 Added repository: ${event.repository}`
    case 'bucket.repository_removed':
      return `🗑️ Removed repository: ${event.repository}`
    case 'bucket.iteration_started':
      return `🚀 Starting iteration for ${event.repository}`
    case 'bucket.iteration_completed':
      return event.success
        ? `✅ Completed iteration for ${event.repository}`
        : `❌ Iteration failed for ${event.repository}: ${event.error}`
    case 'bucket.error':
      return event.repository
        ? `❌ Error for ${event.repository}: ${event.error}`
        : `❌ Error: ${event.error}`
  }
}

// Create an event emitter that sends events via WebSocket
export function createBucketEventEmitter(
  getWebSocket: () => WebSocketLike | null,
  sessionId: string
): BucketEmitFn {
  let sequence = 0

  return (event: BucketEvent) => {
    sequence++

    const payload: BucketEventPayload = {
      type: event.type,
      timestamp: new Date().toISOString(),
      sessionId,
      sequence,
    }

    // Add repository field for repo-specific events
    if ('repository' in event && event.repository) {
      payload.repository = event.repository
    }

    // Add details for events with extra data
    if (event.type === 'bucket.disconnected') {
      payload.details = { code: event.code, reason: event.reason }
    } else if (event.type === 'bucket.iteration_completed') {
      payload.details = { success: event.success, error: event.error }
    } else if (event.type === 'bucket.error') {
      payload.details = { error: event.error }
    }

    const ws = getWebSocket()
    if (ws && ws.readyState === WS_OPEN) {
      try {
        ws.send(JSON.stringify(payload))
      } catch {
        // Fire-and-forget: ignore send errors
      }
    }
  }
}

const DUSTBUCKET_WS_URL = 'wss://dustbucket.com/ws'
const INITIAL_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 30000
const SLEEP_INTERVAL_MS = 30000

export interface Repository {
  name: string
  gitUrl: string
}

export interface RepositoryState {
  repository: Repository
  path: string
  loopPromise: Promise<void> | null
  stopRequested: boolean
}

export interface ContainerState {
  ws: WebSocketLike | null
  repositories: Map<string, RepositoryState>
  reconnectDelay: number
  reconnectTimer: ReturnType<typeof setTimeout> | null
  shuttingDown: boolean
  sessionId: string
  emit: BucketEmitFn
}

export interface ContainerDependencies {
  spawn: typeof nodeSpawn
  createWebSocket: (url: string, token: string) => WebSocketLike
  fileSystem: FileSystem
  sleep: (ms: number) => Promise<void>
  getTempDir: () => string
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

/* v8 ignore start - simple wrappers around native functions */
export function createDefaultContainerDependencies(
  fileSystem: FileSystem
): ContainerDependencies {
  return {
    spawn: nodeSpawn,
    createWebSocket: defaultCreateWebSocket,
    fileSystem,
    sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    getTempDir: () => tmpdir(),
  }
}
/* v8 ignore stop */

export function createInitialContainerState(): ContainerState {
  const sessionId = crypto.randomUUID()
  const state: ContainerState = {
    ws: null,
    repositories: new Map(),
    reconnectDelay: INITIAL_RECONNECT_DELAY_MS,
    reconnectTimer: null,
    shuttingDown: false,
    sessionId,
    emit: () => {}, // Placeholder, replaced when WebSocket connects
  }
  // Create the emitter that references state.ws
  state.emit = createBucketEventEmitter(() => state.ws, sessionId)
  return state
}

/**
 * Parse repository from message data.
 * Supports both simple names and git URLs.
 */
export function parseRepository(data: unknown): Repository | null {
  if (typeof data === 'string') {
    // Simple name format
    return { name: data, gitUrl: data }
  }
  if (
    typeof data === 'object' &&
    data !== null &&
    'name' in data &&
    'gitUrl' in data
  ) {
    const repositoryData = data as { name: unknown; gitUrl: unknown }
    if (
      typeof repositoryData.name === 'string' &&
      typeof repositoryData.gitUrl === 'string'
    ) {
      return { name: repositoryData.name, gitUrl: repositoryData.gitUrl }
    }
  }
  return null
}

/**
 * Get the temp directory path for a repository.
 */
export function getRepoTempPath(repoName: string, tempDir: string): string {
  // Sanitize repo name for use as directory name
  const safeName = repoName.replace(/[^a-zA-Z0-9-_]/g, '-')
  return join(tempDir, `dust-bucket-${safeName}`)
}

/**
 * Clone a repository to a temporary directory.
 */
export async function cloneRepository(
  repository: Repository,
  targetPath: string,
  spawn: typeof nodeSpawn,
  context: CommandDependencies['context']
): Promise<boolean> {
  return new Promise(resolve => {
    const proc = spawn('git', ['clone', repository.gitUrl, targetPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stderr = ''
    proc.stderr?.on('data', data => {
      stderr += data.toString()
    })

    proc.on('close', code => {
      if (code === 0) {
        resolve(true)
      } else {
        context.stderr(`Failed to clone ${repository.name}: ${stderr.trim()}`)
        resolve(false)
      }
    })

    proc.on('error', error => {
      context.stderr(`Failed to clone ${repository.name}: ${error.message}`)
      resolve(false)
    })
  })
}

/**
 * Remove a repository directory.
 */
export async function removeRepository(
  path: string,
  spawn: typeof nodeSpawn,
  context: CommandDependencies['context']
): Promise<boolean> {
  return new Promise(resolve => {
    const proc = spawn('rm', ['-rf', path], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    proc.on('close', code => {
      resolve(code === 0)
    })

    /* v8 ignore next 4 - error handler for rare spawn failures */
    proc.on('error', error => {
      context.stderr(`Failed to remove ${path}: ${error.message}`)
      resolve(false)
    })
  })
}

/**
 * Run git pull in a repository.
 */
export async function gitPull(
  cwd: string,
  spawn: typeof nodeSpawn
): Promise<{ success: boolean; message?: string }> {
  return new Promise(resolve => {
    const proc = spawn('git', ['pull'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stderr = ''
    proc.stderr?.on('data', data => {
      stderr += data.toString()
    })

    proc.on('close', code => {
      if (code === 0) {
        resolve({ success: true })
      } else {
        resolve({ success: false, message: stderr.trim() || 'git pull failed' })
      }
    })

    /* v8 ignore next 4 - error handler for rare spawn failures */
    proc.on('error', error => {
      resolve({ success: false, message: error.message })
    })
  })
}

/**
 * Read the dustCommand from a repository's settings.
 */
export async function readDustCommand(
  repoPath: string,
  fileSystem: FileSystem
): Promise<string> {
  const settingsPath = join(repoPath, '.dust', 'config', 'settings.json')

  if (!fileSystem.exists(settingsPath)) {
    // Default to npx dust if no settings found
    return 'npx dust'
  }

  try {
    const content = await fileSystem.readFile(settingsPath)
    const parsed = JSON.parse(content)
    return parsed.dustCommand || 'npx dust'
    /* v8 ignore next 2 - catch for read/parse errors */
  } catch {
    return 'npx dust'
  }
}

/**
 * Check if tasks are available using `dust next`.
 */
export async function checkForTasks(
  repoPath: string,
  dustCommand: string,
  spawn: typeof nodeSpawn
): Promise<boolean> {
  return new Promise(resolve => {
    const commandParts = dustCommand.split(' ')
    const command = commandParts[0]
    const spawnArguments = [...commandParts.slice(1), 'next']

    const proc = spawn(command, spawnArguments, {
      cwd: repoPath,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    proc.on('close', code => {
      // Exit code 0 means tasks are available
      resolve(code === 0)
    })

    /* v8 ignore next 4 - error handler for rare spawn failures */
    proc.on('error', () => {
      resolve(false)
    })
  })
}

/**
 * Invoke dust to work on tasks.
 */
export async function invokeDust(
  repoPath: string,
  dustCommand: string,
  spawn: typeof nodeSpawn,
  context: CommandDependencies['context']
): Promise<void> {
  return new Promise((resolve, reject) => {
    const commandParts = dustCommand.split(' ')
    const command = commandParts[0]
    const spawnArguments = [
      ...commandParts.slice(1),
      'loop',
      'claude',
      '--max-iterations',
      '1',
    ]

    context.stdout(`🚀 Running ${dustCommand} loop claude in ${repoPath}`)

    const proc = spawn(command, spawnArguments, {
      cwd: repoPath,
      env: {
        ...process.env,
        DUST_UNATTENDED: '1',
      },
      stdio: 'inherit',
    })

    proc.on('close', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`dust exited with code ${code}`))
      }
    })

    /* v8 ignore next 4 - error handler for rare spawn failures */
    proc.on('error', error => {
      reject(error)
    })
  })
}

/**
 * Run the async loop for a single repository.
 */
export async function runRepositoryLoop(
  repoState: RepositoryState,
  containerDeps: ContainerDependencies,
  context: CommandDependencies['context'],
  emit?: BucketEmitFn
): Promise<void> {
  const { spawn, fileSystem, sleep } = containerDeps
  const repoName = repoState.repository.name

  while (!repoState.stopRequested) {
    // Step 1: git pull
    const pullResult = await gitPull(repoState.path, spawn)
    /* v8 ignore next 5 - git pull failure path */
    if (!pullResult.success) {
      context.stderr(`⚠️ git pull failed for ${repoName}: ${pullResult.message}`)
    }

    // Step 2: Read dustCommand
    const dustCommand = await readDustCommand(repoState.path, fileSystem)

    // Step 3: Check for tasks
    const hasTasks = await checkForTasks(repoState.path, dustCommand, spawn)

    /* v8 ignore next 25 - integration path for running dust */
    if (hasTasks) {
      // Emit iteration started
      const startedEvent: BucketIterationStartedEvent = {
        type: 'bucket.iteration_started',
        repository: repoName,
      }
      emit?.(startedEvent)
      context.stdout(formatBucketEvent(startedEvent))

      // Step 4: Invoke dust
      try {
        await invokeDust(repoState.path, dustCommand, spawn, context)
        const completedEvent: BucketIterationCompletedEvent = {
          type: 'bucket.iteration_completed',
          repository: repoName,
          success: true,
        }
        emit?.(completedEvent)
        context.stdout(formatBucketEvent(completedEvent))
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const completedEvent: BucketIterationCompletedEvent = {
          type: 'bucket.iteration_completed',
          repository: repoName,
          success: false,
          error: message,
        }
        emit?.(completedEvent)
        context.stdout(formatBucketEvent(completedEvent))
      }
    } else {
      // Step 5: Sleep before checking again
      context.stdout(`😴 No tasks for ${repoName}. Sleeping...`)
      await sleep(SLEEP_INTERVAL_MS)
    }
  }

  context.stdout(`🛑 Stopped loop for ${repoName}`)
}

/**
 * Add a repository to the container.
 */
export async function addRepository(
  repository: Repository,
  state: ContainerState,
  containerDeps: ContainerDependencies,
  context: CommandDependencies['context']
): Promise<void> {
  if (state.repositories.has(repository.name)) {
    return // Already tracking this repository
  }

  const repoPath = getRepoTempPath(repository.name, containerDeps.getTempDir())

  context.stdout(`📦 Adding repository: ${repository.name}`)

  // Clone the repository
  const success = await cloneRepository(
    repository,
    repoPath,
    containerDeps.spawn,
    context
  )

  /* v8 ignore next 7 - clone failure path */
  if (!success) {
    const errorEvent: BucketErrorEvent = {
      type: 'bucket.error',
      repository: repository.name,
      error: 'Clone failed',
    }
    state.emit(errorEvent)
    context.stderr(formatBucketEvent(errorEvent))
    return
  }

  const repoState: RepositoryState = {
    repository,
    path: repoPath,
    loopPromise: null,
    stopRequested: false,
  }

  state.repositories.set(repository.name, repoState)

  // Emit repository added event
  const addedEvent: BucketRepositoryAddedEvent = {
    type: 'bucket.repository_added',
    repository: repository.name,
  }
  state.emit(addedEvent)
  context.stdout(formatBucketEvent(addedEvent))

  // Start the async loop
  repoState.loopPromise = runRepositoryLoop(
    repoState,
    containerDeps,
    context,
    state.emit
  )
}

/**
 * Remove a repository from the container.
 */
export async function removeRepositoryFromContainer(
  repoName: string,
  state: ContainerState,
  containerDeps: ContainerDependencies,
  context: CommandDependencies['context']
): Promise<void> {
  const repoState = state.repositories.get(repoName)
  if (!repoState) {
    return // Not tracking this repository
  }

  // Signal the loop to stop
  repoState.stopRequested = true

  // Wait for the loop to finish (with a timeout)
  if (repoState.loopPromise) {
    await Promise.race([
      repoState.loopPromise,
      containerDeps.sleep(5000), // 5 second timeout
    ])
  }

  // Remove the directory
  await removeRepository(repoState.path, containerDeps.spawn, context)

  state.repositories.delete(repoName)

  // Emit repository removed event
  const removedEvent: BucketRepositoryRemovedEvent = {
    type: 'bucket.repository_removed',
    repository: repoName,
  }
  state.emit(removedEvent)
  context.stdout(formatBucketEvent(removedEvent))
}

/**
 * Handle a repository-list message from the server.
 */
export async function handleRepositoryList(
  repositories: unknown[],
  state: ContainerState,
  containerDeps: ContainerDependencies,
  context: CommandDependencies['context']
): Promise<void> {
  const incomingRepos = new Map<string, Repository>()

  for (const data of repositories) {
    const repo = parseRepository(data)
    if (repo) {
      incomingRepos.set(repo.name, repo)
    }
  }

  // Add new repositories
  for (const [name, repo] of incomingRepos) {
    if (!state.repositories.has(name)) {
      await addRepository(repo, state, containerDeps, context)
    }
  }

  // Remove repositories that are no longer in the list
  for (const name of state.repositories.keys()) {
    if (!incomingRepos.has(name)) {
      await removeRepositoryFromContainer(name, state, containerDeps, context)
    }
  }
}

/**
 * Connect to dustbucket WebSocket.
 */
export function connectWebSocket(
  token: string,
  state: ContainerState,
  containerDeps: ContainerDependencies,
  context: CommandDependencies['context']
): void {
  if (state.shuttingDown) return

  context.stdout('🔌 Container connecting to dustbucket...')

  const ws = containerDeps.createWebSocket(DUSTBUCKET_WS_URL, token)
  state.ws = ws

  ws.onopen = () => {
    state.emit({ type: 'bucket.connected' })
    context.stdout(formatBucketEvent({ type: 'bucket.connected' }))
    state.reconnectDelay = INITIAL_RECONNECT_DELAY_MS
  }

  ws.onclose = event => {
    const disconnectEvent: BucketDisconnectedEvent = {
      type: 'bucket.disconnected',
      code: event.code,
      reason: event.reason || 'none',
    }
    state.emit(disconnectEvent)
    context.stdout(formatBucketEvent(disconnectEvent))
    state.ws = null

    // Schedule reconnection
    if (!state.shuttingDown) {
      context.stdout(
        `⏳ Reconnecting in ${state.reconnectDelay / 1000} seconds...`
      )
      state.reconnectTimer = setTimeout(() => {
        connectWebSocket(token, state, containerDeps, context)
      }, state.reconnectDelay)

      // Exponential backoff
      state.reconnectDelay = Math.min(
        state.reconnectDelay * 2,
        MAX_RECONNECT_DELAY_MS
      )
    }
  }

  /* v8 ignore next 4 - error handler */
  ws.onerror = error => {
    context.stderr(`WebSocket error: ${error.message}`)
  }

  ws.onmessage = event => {
    try {
      const message = JSON.parse(event.data)
      if (message.type === 'repository-list') {
        const repos = message.repositories ?? []
        context.stdout(
          `📋 Received repository list (${repos.length} repositories)`
        )
        // Handle async without blocking the message handler
        /* v8 ignore next 6 - async error handling */
        handleRepositoryList(repos, state, containerDeps, context).catch(
          error => {
            context.stderr(`Failed to handle repository list: ${error.message}`)
          }
        )
      }
      /* v8 ignore next 3 - error handling for malformed JSON */
    } catch {
      context.stderr(`Failed to parse WebSocket message: ${event.data}`)
    }
  }
}

/**
 * Shutdown the container, stopping all loops and cleaning up.
 */
export async function shutdownContainer(
  state: ContainerState,
  containerDeps: ContainerDependencies,
  context: CommandDependencies['context']
): Promise<void> {
  if (state.shuttingDown) return
  state.shuttingDown = true

  context.stdout('🛑 Container shutting down...')

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
    await removeRepository(repoState.path, containerDeps.spawn, context)
  }

  state.repositories.clear()
}

/* v8 ignore start - main entry point uses process signals */
export async function bucketContainer(
  dependencies: CommandDependencies,
  containerDeps?: ContainerDependencies
): Promise<CommandResult> {
  const { context, fileSystem } = dependencies
  const token = process.env.DUST_API_TOKEN

  if (!token) {
    context.stderr('Error: DUST_API_TOKEN environment variable is not set')
    context.stderr(
      'The container process should be spawned by `dust bucket` with the token'
    )
    return { exitCode: 1 }
  }

  const containerDependencies =
    containerDeps ?? createDefaultContainerDependencies(fileSystem)
  const state = createInitialContainerState()

  context.stdout('📦 dust bucket container started')

  // Connect to WebSocket
  connectWebSocket(token, state, containerDependencies, context)

  // Keep running until we receive SIGTERM or SIGINT
  await new Promise<void>(resolve => {
    const handleSignal = async () => {
      await shutdownContainer(state, containerDependencies, context)
      resolve()
    }

    process.on('SIGTERM', handleSignal)
    process.on('SIGINT', handleSignal)
  })

  context.stdout('👋 Container stopped')
  return { exitCode: 0 }
}
/* v8 ignore stop */

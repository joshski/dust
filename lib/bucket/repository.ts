/**
 * Repository types, parsing, and manager orchestration for dust bucket.
 *
 * Git operations live in repository-git.ts.
 * Loop orchestration lives in repository-loop.ts.
 */

import { spawn as nodeSpawn } from 'node:child_process'
import { homedir } from 'node:os'
import { dirname } from 'node:path'
import { run as claudeRun } from '../claude/run'
import type { CommandDependencies, FileSystem } from '../cli/types'
import type { DockerDependencies } from '../docker/docker-agent'
import {
  readEnvConfig,
  type AuthConfig,
  type RuntimeConfig,
  type SessionConfig,
} from '../env-config'
import { createLogger } from '../logging'
import type {
  ToolExecutionRequest,
  ToolExecutionResult,
} from './command-events-proxy'
import {
  type BucketEmitFn,
  type BucketErrorEvent,
  type BucketRepositoryAddedEvent,
  type BucketRepositoryRemovedEvent,
  formatBucketEvent,
  type SendEventFn,
} from './events'
import {
  appendLogLine,
  createLogBuffer,
  createLogLine,
  type LogBuffer,
} from './log-buffer'
import {
  transition,
  type RepositoryLifecycleState,
} from './repository-lifecycle'
import { getReposDir } from './paths'
import {
  cloneRepository,
  getRepoPath,
  removeRepository,
} from './repository-git'
import { runRepositoryLoop } from './repository-loop'
import type { ToolDefinition } from './server-messages'

export {
  cloneRepository,
  getRepoPath,
  removeRepository,
} from './repository-git'
export { runRepositoryLoop } from './repository-loop'
export type { RepositoryLifecycleState } from './repository-lifecycle'

const log = createLogger('dust:bucket:repository')

export interface Repository {
  name: string
  gitUrl: string
  gitSshUrl: string
  url: string
  id: number
  agentProvider?: string
  branch?: string
}

export interface RepositoryState {
  repository: Repository
  path: string
  logBuffer: LogBuffer
  lifecycle: RepositoryLifecycleState
  agentStatus: 'idle' | 'busy'
  wakeUp?: () => void
  taskAvailablePending?: boolean
}

/**
 * Interface for the subset of bucket state needed by repository management.
 * Avoids circular dependency between repository.ts and bucket.ts.
 */
export interface RepositoryManager {
  repositories: Map<string, RepositoryState>
  logBuffers: Map<string, LogBuffer>
  emit: BucketEmitFn
  sendEvent: SendEventFn
  sessionId: string
}

export interface RepositoryDependencies {
  spawn: typeof nodeSpawn
  run: typeof claudeRun
  fileSystem: FileSystem
  sleep: (ms: number) => Promise<void>
  getReposDir: () => string
  session: SessionConfig
  runtime: RuntimeConfig
  auth: AuthConfig
  /** Optional overrides for Docker dependency functions (for testing) */
  dockerDeps?: Partial<DockerDependencies>
  /** Function to get current tool definitions */
  getTools?: () => ToolDefinition[]
  /** Function to get revealed tool families (for progressive disclosure) */
  getRevealedFamilies?: () => Set<string>
  /** Forward tool execution requests to the bucket server */
  forwardToolExecution?: (
    request: ToolExecutionRequest
  ) => Promise<ToolExecutionResult>
  /** Mark a tool family as revealed (for progressive disclosure) */
  revealFamily?: (familyName: string) => void
  /** Shell runner for pre-flight commands (install, check) */
  shellRunner?: import('../cli/process-runner').ShellRunner
  /** Force Docker mode using bundled default Dockerfile */
  forceDocker?: boolean
  /** Force Apple Container mode using bundled default Dockerfile */
  forceAppleContainer?: boolean
}

/**
 * Handle loop completion: transition lifecycle and reset agent status.
 * Extracted as a named function for testability.
 */
export function handleLoopFinished(repoState: RepositoryState): void {
  log(`loop finished for ${repoState.repository.name}`)
  // Transition to stopped if we were stopping, otherwise back to idle
  if (repoState.lifecycle.type === 'stopping') {
    // stopped transition always succeeds from stopping state
    repoState.lifecycle = { type: 'stopped' }
  } else {
    repoState.lifecycle = { type: 'idle' }
  }
  repoState.agentStatus = 'idle'
  repoState.wakeUp = undefined
}

/**
 * Create a cancel function for a running repository loop.
 * Extracted as a named function for testability.
 */
export function createLoopCancel(repoState: RepositoryState): () => void {
  return () => {
    const stopResult = transition(repoState.lifecycle, { type: 'stop' })
    if (stopResult.ok) {
      repoState.lifecycle = stopResult.state
    } else {
      log(
        `Cannot stop loop for ${repoState.repository.name}: ${stopResult.error}`
      )
    }
  }
}

/**
 * Start (or restart) the per-repository loop and keep lifecycle state accurate.
 */
export function startRepositoryLoop(
  repoState: RepositoryState,
  repoDeps: RepositoryDependencies,
  sendEvent?: SendEventFn,
  sessionId?: string
): void {
  const startResult = transition(repoState.lifecycle, { type: 'start' })
  if (!startResult.ok) {
    log(
      `Cannot start loop for ${repoState.repository.name}: ${startResult.error}`
    )
    return
  }
  repoState.lifecycle = startResult.state

  log(`starting loop for ${repoState.repository.name}`)
  const loopPromise = runRepositoryLoop(
    repoState,
    repoDeps,
    sendEvent,
    sessionId
  )
    .catch(error => {
      const message = error instanceof Error ? error.message : String(error)
      log(`loop crashed for ${repoState.repository.name}: ${message}`)
      appendLogLine(
        repoState.logBuffer,
        createLogLine(`Repository loop crashed: ${message}`, 'stderr')
      )
    })
    .finally(() => handleLoopFinished(repoState))

  const cancel = createLoopCancel(repoState)

  // started transition always succeeds from starting state
  repoState.lifecycle = {
    type: 'running',
    loopPromise,
    cancel,
  }
}

export function createDefaultRepositoryDependencies(
  fileSystem: FileSystem
): RepositoryDependencies {
  const envConfig = readEnvConfig(process.env)
  return {
    spawn: nodeSpawn,
    run: claudeRun,
    fileSystem,
    sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    getReposDir: () => getReposDir(envConfig.session, homedir()),
    session: envConfig.session,
    runtime: envConfig.runtime,
    auth: envConfig.auth,
  }
}

/**
 * Determine if a repository needs to be re-cloned due to branch change.
 * Pure function - compares branch fields between existing and incoming repositories.
 */
export function shouldRecloneForBranchChange(
  existing: Repository,
  incoming: Repository
): boolean {
  return existing.branch !== incoming.branch
}

/**
 * An action to reconcile repository state.
 */
type ReconciliationAction =
  | { type: 'add'; repository: Repository }
  | { type: 'remove'; name: string }
  | { type: 'reclone'; name: string; repository: Repository; reason: string }
  | { type: 'updateProvider'; name: string; newProvider: string | undefined }

/**
 * Compute reconciliation actions needed to sync existing repositories with incoming list.
 * Pure function - compares maps and returns actions without side effects.
 */
export function computeRepositoryReconciliation(
  existing: Map<string, Repository>,
  incoming: Map<string, Repository>
): ReconciliationAction[] {
  const actions: ReconciliationAction[] = []

  // Handle additions, re-clones, and provider updates
  for (const [name, repo] of incoming) {
    const existingRepo = existing.get(name)
    if (!existingRepo) {
      actions.push({ type: 'add', repository: repo })
    } else if (shouldRecloneForBranchChange(existingRepo, repo)) {
      const from = existingRepo.branch ?? '(default)'
      const to = repo.branch ?? '(default)'
      actions.push({
        type: 'reclone',
        name,
        repository: repo,
        reason: `branch changed from ${from} to ${to}`,
      })
    } else if (existingRepo.agentProvider !== repo.agentProvider) {
      actions.push({
        type: 'updateProvider',
        name,
        newProvider: repo.agentProvider,
      })
    }
  }

  // Handle removals
  for (const name of existing.keys()) {
    if (!incoming.has(name)) {
      actions.push({ type: 'remove', name })
    }
  }

  return actions
}

/**
 * Parse repository from message data.
 * Supports both simple names and git URLs.
 */
export function parseRepository(data: unknown): Repository | null {
  if (
    typeof data === 'object' &&
    data !== null &&
    'name' in data &&
    'gitUrl' in data
  ) {
    const repositoryData = data as Record<string, unknown>
    if (
      typeof repositoryData.name === 'string' &&
      typeof repositoryData.gitUrl === 'string' &&
      typeof repositoryData.gitSshUrl === 'string' &&
      typeof repositoryData.url === 'string' &&
      typeof repositoryData.id === 'number'
    ) {
      return {
        name: repositoryData.name,
        gitUrl: repositoryData.gitUrl,
        gitSshUrl: repositoryData.gitSshUrl,
        url: repositoryData.url,
        id: repositoryData.id,
        agentProvider:
          typeof repositoryData.agentProvider === 'string'
            ? repositoryData.agentProvider
            : undefined,
        branch:
          typeof repositoryData.branch === 'string'
            ? repositoryData.branch
            : undefined,
      }
    }
  }
  return null
}

/**
 * Add a repository to the manager.
 */
export async function addRepository(
  repository: Repository,
  manager: RepositoryManager,
  repoDeps: RepositoryDependencies,
  context: CommandDependencies['context']
): Promise<void> {
  if (manager.repositories.has(repository.name)) {
    log(`repository ${repository.name} already exists, skipping add`)
    return
  }

  log(`adding repository ${repository.name}`)
  const repoPath = getRepoPath(repository.name, repoDeps.getReposDir())
  await repoDeps.fileSystem.mkdir(dirname(repoPath), { recursive: true })

  // Clean up stale directory from a previous unclean shutdown
  if (repoDeps.fileSystem.exists(repoPath)) {
    await removeRepository(repoPath, repoDeps.spawn, context)
  }

  context.stdout(`Adding repository: ${repository.name}`)

  const success = await cloneRepository(
    repository,
    repoPath,
    repoDeps.spawn,
    context
  )

  if (!success) {
    const errorEvent: BucketErrorEvent = {
      type: 'bucket.error',
      repository: repository.name,
      error: 'Clone failed',
    }
    manager.emit(errorEvent)
    context.stderr(formatBucketEvent(errorEvent))
    return
  }

  const repoState: RepositoryState = {
    repository,
    path: repoPath,
    logBuffer: manager.logBuffers.get(repository.name) ?? createLogBuffer(),
    lifecycle: { type: 'idle' },
    agentStatus: 'idle',
  }

  manager.repositories.set(repository.name, repoState)

  const addedEvent: BucketRepositoryAddedEvent = {
    type: 'bucket.repository_added',
    repository: repository.name,
  }
  manager.emit(addedEvent)
  context.stdout(formatBucketEvent(addedEvent))

  startRepositoryLoop(repoState, repoDeps, manager.sendEvent, manager.sessionId)
}

/**
 * Remove a repository from the manager.
 */
export async function removeRepositoryFromManager(
  repoName: string,
  manager: RepositoryManager,
  repoDeps: RepositoryDependencies,
  context: CommandDependencies['context']
): Promise<void> {
  const repoState = manager.repositories.get(repoName)
  if (!repoState) {
    return
  }

  log(`removing repository ${repoName}`)
  if (repoState.lifecycle.type === 'running') {
    const { loopPromise, cancel } = repoState.lifecycle
    cancel()
    repoState.wakeUp?.()
    await Promise.race([loopPromise, repoDeps.sleep(5000)])
  } else {
    repoState.wakeUp?.()
  }

  // Ensure we reach a terminal state via state machine transitions
  const lifecycle = repoState.lifecycle
  if (lifecycle.type === 'stopping') {
    // stopped transition always succeeds from stopping state
    repoState.lifecycle = { type: 'stopped' }
  } else if (lifecycle.type !== 'stopped' && lifecycle.type !== 'idle') {
    // stop transition always succeeds from starting/running states
    repoState.lifecycle = { type: 'idle' }
  }

  await removeRepository(repoState.path, repoDeps.spawn, context)

  manager.repositories.delete(repoName)

  const removedEvent: BucketRepositoryRemovedEvent = {
    type: 'bucket.repository_removed',
    repository: repoName,
  }
  manager.emit(removedEvent)
  context.stdout(formatBucketEvent(removedEvent))
}

/**
 * Parse a list of unknown data into a Map of repositories.
 */
export function parseRepositoryList(data: unknown[]): Map<string, Repository> {
  const repos = new Map<string, Repository>()
  for (const item of data) {
    const repo = parseRepository(item)
    if (repo) {
      repos.set(repo.name, repo)
    }
  }
  return repos
}

/**
 * Handle a repository-list message from the server.
 */
export async function handleRepositoryList(
  repositories: unknown[],
  manager: RepositoryManager,
  repoDeps: RepositoryDependencies,
  context: CommandDependencies['context']
): Promise<void> {
  const incoming = parseRepositoryList(repositories)

  // Extract existing repositories from manager state
  const existing = new Map<string, Repository>()
  for (const [name, state] of manager.repositories) {
    existing.set(name, state.repository)
  }

  // Compute actions and apply them
  const actions = computeRepositoryReconciliation(existing, incoming)

  for (const action of actions) {
    switch (action.type) {
      case 'add':
        await addRepository(action.repository, manager, repoDeps, context)
        break
      case 'remove':
        await removeRepositoryFromManager(
          action.name,
          manager,
          repoDeps,
          context
        )
        break
      case 'reclone':
        log(`${action.name}: ${action.reason}, re-cloning`)
        await removeRepositoryFromManager(
          action.name,
          manager,
          repoDeps,
          context
        )
        await addRepository(action.repository, manager, repoDeps, context)
        break
      case 'updateProvider': {
        // updateProvider actions are only created for existing repos
        // biome-ignore lint/style/noNonNullAssertion: guaranteed by computeRepositoryReconciliation
        const repoState = manager.repositories.get(action.name)!
        const from = repoState.repository.agentProvider ?? '(unset)'
        const to = action.newProvider ?? '(unset)'
        log(`${action.name}: agentProvider changed from ${from} to ${to}`)
        repoState.repository.agentProvider = action.newProvider
        break
      }
    }
  }
}

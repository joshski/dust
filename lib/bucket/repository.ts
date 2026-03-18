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
    .finally(() => {
      log(`loop finished for ${repoState.repository.name}`)
      // Transition to stopped if we were stopping, otherwise back to idle
      if (repoState.lifecycle.type === 'stopping') {
        const stoppedResult = transition(repoState.lifecycle, {
          type: 'stopped',
        })
        /* v8 ignore start - defensive check, transition always succeeds from stopping */
        if (stoppedResult.ok) {
          repoState.lifecycle = stoppedResult.state
        }
        /* v8 ignore stop */
      } else {
        repoState.lifecycle = { type: 'idle' }
      }
      repoState.agentStatus = 'idle'
      repoState.wakeUp = undefined
    })

  /* v8 ignore start - cancel callback invoked from within loop */
  const cancel = (): void => {
    const stopResult = transition(repoState.lifecycle, { type: 'stop' })
    if (stopResult.ok) {
      repoState.lifecycle = stopResult.state
    } else {
      log(
        `Cannot stop loop for ${repoState.repository.name}: ${stopResult.error}`
      )
    }
  }
  /* v8 ignore stop */

  const startedResult = transition(repoState.lifecycle, {
    type: 'started',
    loopPromise,
    cancel,
  })
  /* v8 ignore start - defensive check, should always succeed from starting state */
  if (startedResult.ok) {
    repoState.lifecycle = startedResult.state
  } else {
    log(
      `Cannot mark loop started for ${repoState.repository.name}: ${startedResult.error}`
    )
  }
  /* v8 ignore stop */
}

/* v8 ignore start - simple wrappers around native functions */
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
/* v8 ignore stop */

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

  /* v8 ignore start - defensive state machine transitions after async operations */
  // Ensure we reach stopped state via state machine transitions
  const lifecycle = repoState.lifecycle
  if (lifecycle.type === 'stopping') {
    const stoppedResult = transition(lifecycle, { type: 'stopped' })
    if (stoppedResult.ok) {
      repoState.lifecycle = stoppedResult.state
    }
  } else if (lifecycle.type !== 'stopped' && lifecycle.type !== 'idle') {
    // Handle stop from other states (starting)
    const stopResult = transition(lifecycle, { type: 'stop' })
    if (stopResult.ok) {
      repoState.lifecycle = stopResult.state
    }
  }
  /* v8 ignore stop */

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
 * Handle a repository-list message from the server.
 */
export async function handleRepositoryList(
  repositories: unknown[],
  manager: RepositoryManager,
  repoDeps: RepositoryDependencies,
  context: CommandDependencies['context']
): Promise<void> {
  const incomingRepos = new Map<string, Repository>()

  for (const data of repositories) {
    const repo = parseRepository(data)
    if (repo) {
      incomingRepos.set(repo.name, repo)
    }
  }

  // Add new repositories or update existing ones
  for (const [name, repo] of incomingRepos) {
    const existing = manager.repositories.get(name)
    if (!existing) {
      await addRepository(repo, manager, repoDeps, context)
    } else if (shouldRecloneForBranchChange(existing.repository, repo)) {
      const from = existing.repository.branch ?? '(default)'
      const to = repo.branch ?? '(default)'
      log(`${name}: branch changed from ${from} to ${to}, re-cloning`)
      await removeRepositoryFromManager(name, manager, repoDeps, context)
      await addRepository(repo, manager, repoDeps, context)
    } else if (existing.repository.agentProvider !== repo.agentProvider) {
      const from = existing.repository.agentProvider ?? '(unset)'
      const to = repo.agentProvider ?? '(unset)'
      log(`${name}: agentProvider changed from ${from} to ${to}`)
      existing.repository.agentProvider = repo.agentProvider
    }
  }

  // Remove repositories that are no longer in the list
  for (const name of manager.repositories.keys()) {
    if (!incomingRepos.has(name)) {
      await removeRepositoryFromManager(name, manager, repoDeps, context)
    }
  }
}

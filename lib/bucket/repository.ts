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
import { createLogger } from '../logging'
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
import { getReposDir } from './paths'
import {
  cloneRepository,
  getRepoPath,
  removeRepository,
} from './repository-git'
import { runRepositoryLoop } from './repository-loop'

export {
  cloneRepository,
  getRepoPath,
  removeRepository,
} from './repository-git'
export { runRepositoryLoop } from './repository-loop'

const log = createLogger('dust:bucket:repository')

export interface Repository {
  name: string
  gitUrl: string
  gitSshUrl?: string
  url: string
  id: number
  agentProvider?: string
}

export interface RepositoryState {
  repository: Repository
  path: string
  loopPromise: Promise<void> | null
  stopRequested: boolean
  logBuffer: LogBuffer
  agentStatus: 'idle' | 'busy'
  wakeUp?: () => void
  taskAvailablePending?: boolean
  cancelCurrentIteration?: () => void
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
  /** Optional overrides for Docker dependency functions (for testing) */
  dockerDeps?: Partial<DockerDependencies>
}

/**
 * Start (or restart) the per-repository loop and keep loopPromise state accurate.
 */
export function startRepositoryLoop(
  repoState: RepositoryState,
  repoDeps: RepositoryDependencies,
  sendEvent?: SendEventFn,
  sessionId?: string
): void {
  log(`starting loop for ${repoState.repository.name}`)
  repoState.stopRequested = false
  repoState.loopPromise = runRepositoryLoop(
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
      repoState.loopPromise = null
      repoState.agentStatus = 'idle'
      repoState.wakeUp = undefined
      repoState.cancelCurrentIteration = undefined
    })
}

/* v8 ignore start - simple wrappers around native functions */
export function createDefaultRepositoryDependencies(
  fileSystem: FileSystem
): RepositoryDependencies {
  return {
    spawn: nodeSpawn,
    run: claudeRun,
    fileSystem,
    sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    getReposDir: () => getReposDir(process.env, homedir()),
  }
}
/* v8 ignore stop */

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
      typeof repositoryData.url === 'string' &&
      typeof repositoryData.id === 'number'
    ) {
      return {
        name: repositoryData.name,
        gitUrl: repositoryData.gitUrl,
        gitSshUrl:
          typeof repositoryData.gitSshUrl === 'string'
            ? repositoryData.gitSshUrl
            : undefined,
        url: repositoryData.url,
        id: repositoryData.id,
        agentProvider:
          typeof repositoryData.agentProvider === 'string'
            ? repositoryData.agentProvider
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
    loopPromise: null,
    stopRequested: false,
    logBuffer: manager.logBuffers.get(repository.name) ?? createLogBuffer(),
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
  repoState.stopRequested = true
  repoState.cancelCurrentIteration?.()
  repoState.wakeUp?.()

  if (repoState.loopPromise) {
    await Promise.race([repoState.loopPromise, repoDeps.sleep(5000)])
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
    if (!manager.repositories.has(name)) {
      await addRepository(repo, manager, repoDeps, context)
    } else {
      const existing = manager.repositories.get(name)
      /* v8 ignore start -- guarded by has() check above */
      if (!existing) continue
      /* v8 ignore stop */
      if (existing.repository.agentProvider !== repo.agentProvider) {
        const from = existing.repository.agentProvider ?? '(unset)'
        const to = repo.agentProvider ?? '(unset)'
        log(`${name}: agentProvider changed from ${from} to ${to}`)
        existing.repository.agentProvider = repo.agentProvider
      }
    }
  }

  // Remove repositories that are no longer in the list
  for (const name of manager.repositories.keys()) {
    if (!incomingRepos.has(name)) {
      await removeRepositoryFromManager(name, manager, repoDeps, context)
    }
  }
}

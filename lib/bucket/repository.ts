/**
 * Repository types, parsing, and manager orchestration for dust bucket.
 *
 * Git operations live in repository-git.ts.
 * Loop orchestration lives in repository-loop.ts.
 */

import { spawn as nodeSpawn } from 'node:child_process'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { run as claudeRun } from '../claude/run'
import type { CommandDependencies, FileSystem } from '../cli/types'
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

export interface Repository {
  name: string
  gitUrl: string
  url?: string
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
  repoState.stopRequested = false
  repoState.loopPromise = runRepositoryLoop(
    repoState,
    repoDeps,
    sendEvent,
    sessionId
  )
    .catch(error => {
      const message = error instanceof Error ? error.message : String(error)
      appendLogLine(
        repoState.logBuffer,
        createLogLine(`Repository loop crashed: ${message}`, 'stderr')
      )
    })
    .finally(() => {
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
    getReposDir: () =>
      process.env.DUST_REPOS_DIR || join(homedir(), '.dust', 'repos'),
  }
}
/* v8 ignore stop */

/**
 * Parse repository from message data.
 * Supports both simple names and git URLs.
 */
export function parseRepository(data: unknown): Repository | null {
  if (typeof data === 'string') {
    return { name: data, gitUrl: data }
  }
  if (
    typeof data === 'object' &&
    data !== null &&
    'name' in data &&
    'gitUrl' in data
  ) {
    const repositoryData = data as {
      name: unknown
      gitUrl: unknown
      url?: unknown
    }
    if (
      typeof repositoryData.name === 'string' &&
      typeof repositoryData.gitUrl === 'string'
    ) {
      const repo: Repository = {
        name: repositoryData.name,
        gitUrl: repositoryData.gitUrl,
      }
      if (typeof repositoryData.url === 'string') {
        repo.url = repositoryData.url
      }
      return repo
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
    return
  }

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

  // Add new repositories
  for (const [name, repo] of incomingRepos) {
    if (!manager.repositories.has(name)) {
      await addRepository(repo, manager, repoDeps, context)
    }
  }

  // Remove repositories that are no longer in the list
  for (const name of manager.repositories.keys()) {
    if (!incomingRepos.has(name)) {
      await removeRepositoryFromManager(name, manager, repoDeps, context)
    }
  }
}

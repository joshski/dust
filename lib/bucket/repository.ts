/**
 * Repository management for dust bucket.
 *
 * Handles cloning, syncing, task checking, and running dust loops
 * for repositories managed by dustbucket.
 */

import { spawn as nodeSpawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  run as claudeRun,
  defaultRunnerDependencies,
  type RunnerDependencies,
} from '../claude/run'
import {
  type DustWireEvent,
  type EmitFn,
  formatEvent,
  type LoopDependencies,
  runOneIteration,
} from '../cli/commands/loop'
import type { CommandDependencies, FileSystem } from '../cli/types'
import { loadSettings } from '../config/settings'
import {
  type BucketEmitFn,
  type BucketErrorEvent,
  type BucketRepositoryAddedEvent,
  type BucketRepositoryRemovedEvent,
  formatBucketEvent,
} from './events'
import {
  appendLogLine,
  createLogBuffer,
  createLogLine,
  type LogBuffer,
} from './log-buffer'

export interface Repository {
  name: string
  gitUrl: string
}

export interface RepositoryState {
  repository: Repository
  path: string
  loopPromise: Promise<void> | null
  stopRequested: boolean
  logBuffer: LogBuffer
}

/**
 * Interface for the subset of bucket state needed by repository management.
 * Avoids circular dependency between repository.ts and bucket.ts.
 */
export interface RepositoryManager {
  repositories: Map<string, RepositoryState>
  logBuffers: Map<string, LogBuffer>
  emit: BucketEmitFn
}

export interface RepositoryDependencies {
  spawn: typeof nodeSpawn
  run: typeof claudeRun
  fileSystem: FileSystem
  sleep: (ms: number) => Promise<void>
  getTempDir: () => string
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
    getTempDir: () => tmpdir(),
  }
}
/* v8 ignore stop */

const SLEEP_INTERVAL_MS = 30000

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
 * Create a no-op glob scanner for CommandDependencies.
 * The `next` command only uses fileSystem, not globScanner.
 */
/* v8 ignore start */
function createNoOpGlobScanner() {
  return {
    scan: async function* () {
      // no-op
    },
  }
}
/* v8 ignore stop */

/**
 * Run the async loop for a single repository.
 */
export async function runRepositoryLoop(
  repoState: RepositoryState,
  repoDeps: RepositoryDependencies,
  emit?: BucketEmitFn
): Promise<void> {
  const { spawn, run, fileSystem, sleep } = repoDeps
  const repoName = repoState.repository.name

  // Build CommandDependencies for runOneIteration
  const settings = await loadSettings(repoState.path, fileSystem)
  const commandDeps: CommandDependencies = {
    arguments: [],
    context: {
      cwd: repoState.path,
      stdout: (msg: string) =>
        appendLogLine(repoState.logBuffer, createLogLine(msg, 'stdout')),
      stderr: (msg: string) =>
        appendLogLine(repoState.logBuffer, createLogLine(msg, 'stderr')),
    },
    fileSystem,
    globScanner: createNoOpGlobScanner(),
    settings,
  }

  // Wrap run to redirect Claude output to the repo's log buffer
  // instead of writing directly to process.stdout
  let partialLine = ''
  const bufferSinkDeps: RunnerDependencies = {
    ...defaultRunnerDependencies,
    createStdoutSink: () => ({
      write: (text: string) => {
        partialLine += text
        const lines = partialLine.split('\n')
        // All complete lines get flushed; last segment is the pending partial
        for (let i = 0; i < lines.length - 1; i++) {
          appendLogLine(repoState.logBuffer, createLogLine(lines[i], 'stdout'))
        }
        partialLine = lines[lines.length - 1]
      },
      line: (text: string) => {
        // Flush any pending partial text first
        if (partialLine) {
          appendLogLine(
            repoState.logBuffer,
            createLogLine(partialLine, 'stdout')
          )
          partialLine = ''
        }
        // Split multi-line content (e.g. tool_result file contents)
        // into separate log lines
        for (const segment of text.split('\n')) {
          appendLogLine(repoState.logBuffer, createLogLine(segment, 'stdout'))
        }
      },
    }),
  }
  const bufferRun: typeof claudeRun = (prompt, options) =>
    run(prompt, options, bufferSinkDeps)

  const loopDeps: LoopDependencies = {
    spawn,
    run: bufferRun,
    sleep,
    postEvent: async () => {},
  }

  // Map DustWireEvents to bucket events and log output
  const loopEmit: EmitFn = (event: DustWireEvent) => {
    // Log formatted event to the repo's log buffer
    const formatted = formatEvent(event)
    if (formatted !== null) {
      appendLogLine(repoState.logBuffer, createLogLine(formatted, 'stdout'))
    }

    // Forward all session events over WebSocket (except high-volume raw events)
    if (event.type !== 'claude.raw_event') {
      emit?.({
        type: 'bucket.repository_session_event',
        repository: repoName,
        event: event as { type: string; [key: string]: unknown },
      })
    }
  }

  while (!repoState.stopRequested) {
    const result = await runOneIteration(commandDeps, loopDeps, loopEmit)

    if (result === 'no_tasks') {
      await sleep(SLEEP_INTERVAL_MS)
    }
  }

  appendLogLine(
    repoState.logBuffer,
    createLogLine(`Stopped loop for ${repoName}`, 'stdout')
  )
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

  const repoPath = getRepoTempPath(repository.name, repoDeps.getTempDir())

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

  /* v8 ignore next 7 - clone failure path */
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
  }

  manager.repositories.set(repository.name, repoState)

  const addedEvent: BucketRepositoryAddedEvent = {
    type: 'bucket.repository_added',
    repository: repository.name,
  }
  manager.emit(addedEvent)
  context.stdout(formatBucketEvent(addedEvent))

  repoState.loopPromise = runRepositoryLoop(repoState, repoDeps, manager.emit)
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

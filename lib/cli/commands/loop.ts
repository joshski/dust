/**
 * dust loop claude - Continuous Claude iteration on available tasks
 *
 * Runs Claude Code in a loop to work on tasks continuously:
 * 1. Sync with remote (git pull)
 * 2. Check for available tasks via `dust next`
 * 3. If no tasks, sleep and retry
 * 4. If tasks available, invoke Claude Code
 * 5. Repeat until max iterations reached (default: 10)
 *
 * Usage: dust loop claude [max-iterations]
 * - max-iterations: Maximum number of task iterations (default: 10)
 * - Sleep iterations (when no tasks) don't count toward max
 *
 * Settings (.dust/config/settings.json):
 * - eventsUrl: When set, HTTP POST every event to this URL with sequence number
 */

import { spawn as nodeSpawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  type AgentSessionEvent,
  createHeartbeatThrottler,
  type EventMessage,
  formatAgentEvent,
} from '../../agent-events'
import { run as claudeRun } from '../../claude/run'
import type { DockerSpawnConfig } from '../../claude/types'
import {
  buildDockerImage,
  type DockerDependencies,
  generateImageTag,
  hasDockerfile,
  isDockerAvailable,
} from '../../docker/docker-agent'
import { createLogger, enableFileLogs } from '../../logging'
import { buildUnattendedEnv, isUnattended } from '../../session'
import { DUST_VERSION } from '../../version'
import type { CommandDependencies, CommandResult } from '../types'
import { manageGitHooks } from './agent-shared'
import { buildImplementationInstructions } from './focus'
import { findUnblockedTasks, type UnblockedTask } from './next'

function getEnvironmentContext(cwd: string): {
  machineName: string
  cwd: string
  platform: string
  dustVersion: string
  runtimeVersion: string
} {
  return {
    machineName: os.hostname(),
    cwd,
    platform: `${os.platform()} ${os.release()}`,
    dustVersion: DUST_VERSION,
    runtimeVersion: process.version,
  }
}

// Strongly typed loop-only events (never sent over the wire)
export interface LoopWarningEvent {
  type: 'loop.warning'
}

export interface LoopStartedEvent {
  type: 'loop.started'
  maxIterations: number
  agentType?: string
}

export interface LoopSyncingEvent {
  type: 'loop.syncing'
}

export interface LoopSyncSkippedEvent {
  type: 'loop.sync_skipped'
  reason: string
}

export interface LoopCheckingTasksEvent {
  type: 'loop.checking_tasks'
}

export interface LoopNoTasksEvent {
  type: 'loop.no_tasks'
}

export interface LoopTasksFoundEvent {
  type: 'loop.tasks_found'
}

export interface LoopIterationCompleteEvent {
  type: 'loop.iteration_complete'
  iteration: number
  maxIterations: number
}

export interface LoopEndedEvent {
  type: 'loop.ended'
  maxIterations: number
}

export interface LoopDockerDetectedEvent {
  type: 'loop.docker_detected'
  imageTag: string
}

export interface LoopDockerBuildingEvent {
  type: 'loop.docker_building'
  imageTag: string
}

export interface LoopDockerBuiltEvent {
  type: 'loop.docker_built'
  imageTag: string
}

export interface LoopDockerErrorEvent {
  type: 'loop.docker_error'
  error: string
}

export type LoopEvent =
  | LoopWarningEvent
  | LoopStartedEvent
  | LoopSyncingEvent
  | LoopSyncSkippedEvent
  | LoopCheckingTasksEvent
  | LoopNoTasksEvent
  | LoopTasksFoundEvent
  | LoopIterationCompleteEvent
  | LoopEndedEvent
  | LoopDockerDetectedEvent
  | LoopDockerBuildingEvent
  | LoopDockerBuiltEvent
  | LoopDockerErrorEvent

export type LoopEmitFn = (event: LoopEvent) => void

// Format a loop event for console output.
// Returns null for events that should not be displayed.
export function formatLoopEvent(event: LoopEvent): string | null {
  switch (event.type) {
    case 'loop.warning':
      return 'WARNING: This command skips all permission checks. Only use in a sandbox environment!'
    case 'loop.started': {
      const agent = event.agentType ?? 'claude'
      return `Starting dust loop ${agent} (max ${event.maxIterations} iterations)...`
    }
    case 'loop.syncing':
      return 'Syncing with remote'
    case 'loop.sync_skipped':
      return `Note: git pull skipped (${event.reason})`
    case 'loop.checking_tasks':
      return null
    case 'loop.no_tasks':
      return 'No tasks available. Sleeping...'
    case 'loop.tasks_found':
      return 'Found a task. Going to work!\n'
    case 'loop.iteration_complete':
      return `Completed iteration ${event.iteration}/${event.maxIterations}`
    case 'loop.ended':
      return `Reached max iterations (${event.maxIterations}). Exiting.`
    case 'loop.docker_detected':
      return `Docker mode: found .dust/Dockerfile (image: ${event.imageTag})`
    case 'loop.docker_building':
      return `Building Docker image ${event.imageTag}...`
    case 'loop.docker_built':
      return `Docker image ${event.imageTag} ready`
    case 'loop.docker_error':
      return `Docker error: ${event.error}`
  }
}

export type PostEventFn = (url: string, payload: EventMessage) => Promise<void>

export interface LoopDependencies {
  spawn: typeof nodeSpawn
  run: typeof claudeRun
  sleep: (ms: number) => Promise<void>
  postEvent: PostEventFn
  agentType?: string
  fetch?: typeof fetch
  /** Optional overrides for Docker dependency functions (for testing) */
  dockerDeps?: Partial<DockerDependencies>
}

export function createPostEvent(fetchFn: typeof fetch): PostEventFn {
  return async (url: string, payload: EventMessage): Promise<void> => {
    await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }
}

export function createDefaultDependencies(): LoopDependencies {
  return {
    spawn: nodeSpawn,
    run: claudeRun,
    sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    postEvent: createPostEvent(fetch),
  }
}

export type SendAgentEventFn = (event: AgentSessionEvent) => void

export function createWireEventSender(
  eventsUrl: string | undefined,
  sessionId: string,
  postEvent: PostEventFn,
  onError: (error: unknown) => void,
  getAgentSessionId?: () => string | undefined,
  repository = ''
): SendAgentEventFn {
  let sequence = 0

  return (event: AgentSessionEvent) => {
    if (!eventsUrl) return

    sequence++

    const payload: EventMessage = {
      sequence,
      timestamp: new Date().toISOString(),
      sessionId,
      repository,
      event,
    }

    const agentSessionId = getAgentSessionId?.()
    if (agentSessionId) {
      payload.agentSessionId = agentSessionId
    }

    postEvent(eventsUrl, payload).catch(onError)
  }
}

const log = createLogger('dust:cli:commands:loop')

const SLEEP_INTERVAL_MS = 30000 // 30s poll interval balances responsiveness with avoiding excessive git pulls
const SLEEP_STEP_MS = 1000
const DEFAULT_MAX_ITERATIONS = 10 // Safety cap to prevent runaway loops in unattended mode

async function sleepWithProgress(
  sleep: (ms: number) => Promise<void>,
  totalMs: number,
  writeInline: (message: string) => void,
  writeLine: (message: string) => void
): Promise<void> {
  let remainingMs = totalMs
  while (remainingMs > 0) {
    const stepMs = Math.min(SLEEP_STEP_MS, remainingMs)
    await sleep(stepMs)
    writeInline('.')
    remainingMs -= stepMs
  }
  writeLine('')
}

type GitPullResult = { success: true } | { success: false; message: string }

export async function gitPull(
  cwd: string,
  spawn: typeof nodeSpawn
): Promise<GitPullResult> {
  return new Promise(resolve => {
    const proc = spawn('git', ['pull'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
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

    proc.on('error', error => {
      resolve({ success: false, message: error.message })
    })
  })
}

export async function findAvailableTasks(
  dependencies: CommandDependencies
): Promise<UnblockedTask[]> {
  const { context, fileSystem, directoryFileSorter } = dependencies
  const result = await findUnblockedTasks(
    context.cwd,
    fileSystem,
    directoryFileSorter
  )
  return result.tasks
}

type IterationResult =
  | 'no_tasks'
  | 'ran_claude'
  | 'claude_error'
  | 'resolved_pull_conflict'

type LogFn = (message: string) => void

interface IterationOptions {
  onRawEvent?: (rawEvent: Record<string, unknown>) => void
  hooksInstalled?: boolean
  signal?: AbortSignal
  logger?: LogFn
  repositoryId?: string
  /** Docker spawn config when running in Docker mode */
  docker?: DockerSpawnConfig
}

export async function runOneIteration(
  dependencies: CommandDependencies,
  loopDependencies: LoopDependencies,
  onLoopEvent: LoopEmitFn,
  onAgentEvent?: SendAgentEventFn,
  options: IterationOptions = {}
): Promise<IterationResult> {
  const { context } = dependencies
  const { spawn, run } = loopDependencies
  const agentName = loopDependencies.agentType === 'codex' ? 'Codex' : 'Claude'

  const {
    onRawEvent,
    hooksInstalled = false,
    signal,
    logger = log,
    repositoryId,
    docker,
  } = options
  const baseEnv = buildUnattendedEnv({ repositoryId })

  // Step 1: Sync with remote
  log('syncing with remote')
  onLoopEvent({ type: 'loop.syncing' })
  const pullResult = await gitPull(context.cwd, spawn)
  if (!pullResult.success) {
    log(`git pull failed: ${pullResult.message}`)
    onLoopEvent({
      type: 'loop.sync_skipped',
      reason: pullResult.message,
    })

    const prompt = `Note: Do NOT run \`dust agent\`.

git pull failed with the following error:

${pullResult.message}

Please resolve this issue. Common approaches:
1. If there are merge conflicts, resolve them
2. If local commits need to be rebased, use git rebase
3. After resolving, commit any changes and push to remote

Make sure the repository is in a clean state and synced with remote before finishing.`

    onAgentEvent?.({
      type: 'agent-session-started',
      title: 'Resolving git conflict',
      prompt,
      agentType: loopDependencies.agentType ?? 'claude',
      purpose: 'git-conflict',
      ...getEnvironmentContext(context.cwd),
    })
    try {
      await run(prompt, {
        spawnOptions: {
          cwd: context.cwd,
          dangerouslySkipPermissions: true,
          env: baseEnv,
          signal,
          docker,
        },
        onRawEvent,
      })
      onAgentEvent?.({ type: 'agent-session-ended', success: true })
      return 'resolved_pull_conflict'
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      context.stderr(
        `${agentName} failed to resolve git pull conflict: ${errorMessage}`
      )
      onAgentEvent?.({
        type: 'agent-session-ended',
        success: false,
        error: errorMessage,
      })
    }
  }

  // Step 2: Check for available tasks
  onLoopEvent({ type: 'loop.checking_tasks' })
  const tasks = await findAvailableTasks(dependencies)

  if (tasks.length === 0) {
    log('no tasks available')
    onLoopEvent({ type: 'loop.no_tasks' })
    return 'no_tasks'
  }

  // Step 3: Invoke Claude Code with the first available task
  const task = tasks[0]
  log(`found ${tasks.length} task(s), picking: ${task.title ?? task.path}`)
  onLoopEvent({ type: 'loop.tasks_found' })
  const taskContent = await dependencies.fileSystem.readFile(
    `${dependencies.context.cwd}/${task.path}`
  )
  const { dustCommand, installCommand = 'npm install' } = dependencies.settings
  const instructions = buildImplementationInstructions(
    dustCommand,
    hooksInstalled,
    task.title ?? undefined,
    task.path,
    installCommand
  )
  const prompt = `Implement the task at \`${task.path}\`:

----------
${taskContent}
----------

## How to implement the task

${instructions}`

  onAgentEvent?.({
    type: 'agent-session-started',
    title: task.title ?? task.path,
    prompt,
    agentType: loopDependencies.agentType ?? 'claude',
    purpose: 'task',
    ...getEnvironmentContext(context.cwd),
  })
  try {
    await run(prompt, {
      spawnOptions: {
        cwd: context.cwd,
        dangerouslySkipPermissions: true,
        env: baseEnv,
        signal,
        docker,
      },
      onRawEvent,
    })
    log(`${agentName} completed task: ${task.title ?? task.path}`)
    onAgentEvent?.({ type: 'agent-session-ended', success: true })
    return 'ran_claude'
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger(
      `${agentName} error on task ${task.title ?? task.path}: ${errorMessage}`
    )
    context.stderr(`${agentName} exited with error: ${errorMessage}`)
    onAgentEvent?.({
      type: 'agent-session-ended',
      success: false,
      error: errorMessage,
    })
    return 'claude_error'
  }
}

export function parseMaxIterations(commandArguments: string[]): number {
  if (commandArguments.length === 0) {
    return DEFAULT_MAX_ITERATIONS
  }
  const parsed = Number.parseInt(commandArguments[0], 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_MAX_ITERATIONS
  }
  return parsed
}

export async function loopClaude(
  dependencies: CommandDependencies,
  loopDependencies: LoopDependencies = createDefaultDependencies()
): Promise<CommandResult> {
  enableFileLogs('loop')
  const { context, settings } = dependencies

  if (isUnattended()) {
    context.stderr(
      'dust loop cannot run inside an unattended session (DUST_UNATTENDED is set)'
    )
    return { exitCode: 1 }
  }
  const { postEvent } = loopDependencies
  const maxIterations = parseMaxIterations(dependencies.arguments)

  const eventsUrl = settings.eventsUrl
  const sessionId = crypto.randomUUID()
  let agentSessionId: string | undefined

  const sendWireEvent = createWireEventSender(
    eventsUrl,
    sessionId,
    postEvent,
    error => {
      const message = error instanceof Error ? error.message : String(error)
      context.stderr(`Event POST failed: ${message}`)
    },
    () => agentSessionId
  )

  const onLoopEvent: LoopEmitFn = event => {
    const formatted = formatLoopEvent(event)
    if (formatted !== null) {
      context.stdout(formatted)
    }
  }

  const onAgentEvent: SendAgentEventFn = event => {
    const formatted = formatAgentEvent(event)
    if (formatted !== null) {
      context.stdout(formatted)
    }
    sendWireEvent(event)
  }

  // Install git hooks before starting iterations
  const hooksInstalled = await manageGitHooks(dependencies)

  // Check for Docker mode (.dust/Dockerfile)
  let dockerConfig: DockerSpawnConfig | undefined
  const dockerDeps: DockerDependencies = {
    spawn: loopDependencies.dockerDeps?.spawn ?? loopDependencies.spawn,
    homedir: loopDependencies.dockerDeps?.homedir ?? os.homedir,
    existsSync: loopDependencies.dockerDeps?.existsSync ?? existsSync,
  }

  if (hasDockerfile(context.cwd, dockerDeps)) {
    const imageTag = generateImageTag(context.cwd)
    onLoopEvent({ type: 'loop.docker_detected', imageTag })

    // Verify Docker is available
    if (!(await isDockerAvailable(dockerDeps))) {
      context.stderr(
        'Docker not available. Install Docker or remove .dust/Dockerfile to run without Docker.'
      )
      return { exitCode: 1 }
    }

    // Build the Docker image
    onLoopEvent({ type: 'loop.docker_building', imageTag })
    const buildResult = await buildDockerImage(
      { repoPath: context.cwd, imageTag },
      dockerDeps
    )

    if (!buildResult.success) {
      onLoopEvent({ type: 'loop.docker_error', error: buildResult.error })
      context.stderr(buildResult.error)
      return { exitCode: 1 }
    }

    onLoopEvent({ type: 'loop.docker_built', imageTag })

    // Configure Docker spawn
    const homeDir = os.homedir()
    dockerConfig = {
      imageTag,
      repoPath: context.cwd,
      homeDir,
      hasGitconfig: existsSync(path.join(homeDir, '.gitconfig')),
    }
  }

  log(`starting loop, maxIterations=${maxIterations}, sessionId=${sessionId}`)
  onLoopEvent({ type: 'loop.warning' })
  onLoopEvent({
    type: 'loop.started',
    maxIterations,
    agentType: loopDependencies.agentType,
  })
  context.stdout('   Press Ctrl+C to stop')
  context.stdout('')

  let completedIterations = 0
  // Build iteration options
  const iterationOptions: IterationOptions = {
    hooksInstalled,
    docker: dockerConfig,
  }
  if (eventsUrl) {
    iterationOptions.onRawEvent = createHeartbeatThrottler(onAgentEvent)
  }

  while (completedIterations < maxIterations) {
    agentSessionId = crypto.randomUUID()
    const result = await runOneIteration(
      dependencies,
      loopDependencies,
      onLoopEvent,
      onAgentEvent,
      iterationOptions
    )

    if (result === 'no_tasks') {
      log('sleeping, no tasks')
      const writeInline = context.stdoutInline ?? context.stdout
      await sleepWithProgress(
        loopDependencies.sleep,
        SLEEP_INTERVAL_MS,
        writeInline,
        context.stdout
      )
    } else {
      // Count iterations where Claude actually ran (ran_claude, claude_error, resolved_pull_conflict)
      completedIterations++
      log(
        `iteration ${completedIterations}/${maxIterations} complete, result=${result}`
      )
      onLoopEvent({
        type: 'loop.iteration_complete',
        iteration: completedIterations,
        maxIterations,
      })
    }
  }

  log(`loop ended after ${completedIterations} iterations`)
  onLoopEvent({ type: 'loop.ended', maxIterations })
  return { exitCode: 0 }
}

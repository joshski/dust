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
import {
  type AgentSessionEvent,
  type EventMessage,
  formatAgentEvent,
  rawEventToAgentEvent,
} from '../../agent-events'
import { run as claudeRun } from '../../claude/run'
import type { CommandDependencies, CommandResult } from '../types'
import { buildImplementationInstructions } from './focus'
import { findUnblockedTasks, type UnblockedTask } from './next'

// Strongly typed loop-only events (never sent over the wire)
export interface LoopWarningEvent {
  type: 'loop.warning'
}

export interface LoopStartedEvent {
  type: 'loop.started'
  maxIterations: number
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

export interface LoopStartAgentEvent {
  type: 'loop.start_agent'
  prompt: string
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
  | LoopStartAgentEvent

export type LoopEmitFn = (event: LoopEvent) => void

// Format a loop event for console output.
// Returns null for events that should not be displayed.
export function formatLoopEvent(event: LoopEvent): string | null {
  switch (event.type) {
    case 'loop.warning':
      return '⚠️  WARNING: This command skips all permission checks. Only use in a sandbox environment!'
    case 'loop.started':
      return `🔄 Starting dust loop claude (max ${event.maxIterations} iterations)...`
    case 'loop.syncing':
      return '🌍 Syncing with remote'
    case 'loop.sync_skipped':
      return `Note: git pull skipped (${event.reason})`
    case 'loop.checking_tasks':
      return null
    case 'loop.no_tasks':
      return '😴 No tasks available. Sleeping...\n'
    case 'loop.tasks_found':
      return '✨ Found a task. Going to work!\n'
    case 'loop.iteration_complete':
      return `📋 Completed iteration ${event.iteration}/${event.maxIterations}`
    case 'loop.ended':
      return `🏁 Reached max iterations (${event.maxIterations}). Exiting.`
    case 'loop.start_agent':
      return null
  }
}

export type PostEventFn = (url: string, payload: EventMessage) => Promise<void>

export interface LoopDependencies {
  spawn: typeof nodeSpawn
  run: typeof claudeRun
  sleep: (ms: number) => Promise<void>
  postEvent: PostEventFn
}

/* v8 ignore start - thin wrapper around fetch, tested via integration */
async function defaultPostEvent(
  url: string,
  payload: EventMessage
): Promise<void> {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
/* v8 ignore stop */

export function createDefaultDependencies(): LoopDependencies {
  return {
    spawn: nodeSpawn,
    run: claudeRun,
    sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    postEvent: defaultPostEvent,
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

const SLEEP_INTERVAL_MS = 30000
const DEFAULT_MAX_ITERATIONS = 10

export type GitPullResult =
  | { success: true }
  | { success: false; message: string }

export async function gitPull(
  cwd: string,
  spawn: typeof nodeSpawn
): Promise<GitPullResult> {
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

    proc.on('error', error => {
      resolve({ success: false, message: error.message })
    })
  })
}

export async function findAvailableTasks(
  dependencies: CommandDependencies
): Promise<UnblockedTask[]> {
  const { context, fileSystem } = dependencies
  const result = await findUnblockedTasks(context.cwd, fileSystem)
  return result.tasks
}

export type IterationResult =
  | 'no_tasks'
  | 'ran_claude'
  | 'claude_error'
  | 'resolved_pull_conflict'

export interface IterationOptions {
  onRawEvent?: (rawEvent: Record<string, unknown>) => void
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

  const { onRawEvent } = options

  // Step 1: Sync with remote
  onLoopEvent({ type: 'loop.syncing' })
  const pullResult = await gitPull(context.cwd, spawn)
  if (!pullResult.success) {
    onLoopEvent({
      type: 'loop.sync_skipped',
      reason: pullResult.message,
    })

    onAgentEvent?.({
      type: 'agent-session-started',
      title: 'Resolving git conflict',
    })
    const prompt = `git pull failed with the following error:

${pullResult.message}

Please resolve this issue. Common approaches:
1. If there are merge conflicts, resolve them
2. If local commits need to be rebased, use git rebase
3. After resolving, commit any changes and push to remote

Make sure the repository is in a clean state and synced with remote before finishing.`

    onLoopEvent({ type: 'loop.start_agent', prompt })
    try {
      await run(prompt, {
        spawnOptions: {
          cwd: context.cwd,
          dangerouslySkipPermissions: true,
          env: { DUST_UNATTENDED: '1' },
        },
        onRawEvent,
      })
      onAgentEvent?.({ type: 'agent-session-ended', success: true })
      return 'resolved_pull_conflict'
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      context.stderr(
        `Claude failed to resolve git pull conflict: ${errorMessage}`
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
    onLoopEvent({ type: 'loop.no_tasks' })
    return 'no_tasks'
  }

  // Step 3: Invoke Claude Code with the first available task
  const task = tasks[0]
  onLoopEvent({ type: 'loop.tasks_found' })
  onAgentEvent?.({
    type: 'agent-session-started',
    title: task.title ?? task.path,
  })
  const taskContent = await dependencies.fileSystem.readFile(
    `${dependencies.context.cwd}/${task.path}`
  )
  const { dustCommand, installCommand = 'npm install' } = dependencies.settings
  const instructions = buildImplementationInstructions(dustCommand, true)
  const prompt = `Run \`${installCommand}\` to install dependencies, then implement the following task.

## Task: ${task.title}

The following is the contents of the task file \`${task.path}\`:

${taskContent}

When the task is complete, delete the task file \`${task.path}\`.

## Instructions

${instructions}`

  onLoopEvent({ type: 'loop.start_agent', prompt })
  try {
    await run(prompt, {
      spawnOptions: {
        cwd: context.cwd,
        dangerouslySkipPermissions: true,
        env: { DUST_UNATTENDED: '1' },
      },
      onRawEvent,
    })
    onAgentEvent?.({ type: 'agent-session-ended', success: true })
    return 'ran_claude'
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    context.stderr(`Claude exited with error: ${errorMessage}`)
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
  const { context, settings } = dependencies
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

  onLoopEvent({ type: 'loop.warning' })
  onLoopEvent({ type: 'loop.started', maxIterations })
  context.stdout('   Press Ctrl+C to stop')
  context.stdout('')

  let completedIterations = 0
  // Build iteration options
  const iterationOptions: IterationOptions = {}
  if (eventsUrl) {
    iterationOptions.onRawEvent = (rawEvent: Record<string, unknown>) => {
      onAgentEvent(rawEventToAgentEvent(rawEvent))
    }
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
      await loopDependencies.sleep(SLEEP_INTERVAL_MS)
    } else {
      // Count iterations where Claude actually ran (ran_claude, claude_error, resolved_pull_conflict)
      completedIterations++
      onLoopEvent({
        type: 'loop.iteration_complete',
        iteration: completedIterations,
        maxIterations,
      })
    }
  }

  onLoopEvent({ type: 'loop.ended', maxIterations })
  return { exitCode: 0 }
}

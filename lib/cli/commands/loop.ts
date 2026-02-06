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
import { run as claudeRun } from '../../claude/run'
import type { CommandDependencies, CommandResult } from '../types'
import { next } from './next'

// Strongly typed events - discriminated union
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

export interface ClaudeStartedEvent {
  type: 'claude.started'
}

export interface ClaudeEndedEvent {
  type: 'claude.ended'
  success: boolean
  error?: string
}

export interface ClaudeRawEvent {
  type: 'claude.raw_event'
  rawEvent: Record<string, unknown>
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

export type DustWireEvent =
  | LoopWarningEvent
  | LoopStartedEvent
  | LoopSyncingEvent
  | LoopSyncSkippedEvent
  | LoopCheckingTasksEvent
  | LoopNoTasksEvent
  | LoopTasksFoundEvent
  | ClaudeStartedEvent
  | ClaudeEndedEvent
  | ClaudeRawEvent
  | LoopIterationCompleteEvent
  | LoopEndedEvent

export type EmitFn = (event: DustWireEvent) => void

// Format event for console output
// Returns null for events that should not be displayed to console
export function formatEvent(event: DustWireEvent): string | null {
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
    case 'claude.started':
      return '🤖 Starting Claude...'
    case 'claude.ended':
      return event.success
        ? '🤖 Claude session ended (success)'
        : `🤖 Claude session ended (error: ${event.error})`
    case 'claude.raw_event':
      // Raw events are high-volume and not displayed to console
      return null
    case 'loop.iteration_complete':
      return `📋 Completed iteration ${event.iteration}/${event.maxIterations}`
    case 'loop.ended':
      return `🏁 Reached max iterations (${event.maxIterations}). Exiting.`
  }
}

// Wire format for HTTP POST (dust event protocol)
export interface EventPayload {
  sequence: number
  timestamp: string
  sessionId: string
  agentType?: string
  agentSessionId?: string
  event: DustWireEvent
}

export type PostEventFn = (url: string, payload: EventPayload) => Promise<void>

export interface LoopDependencies {
  spawn: typeof nodeSpawn
  run: typeof claudeRun
  sleep: (ms: number) => Promise<void>
  postEvent: PostEventFn
}

/* v8 ignore start - thin wrapper around fetch, tested via integration */
async function defaultPostEvent(
  url: string,
  payload: EventPayload
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

export function createEventPoster(
  eventsUrl: string | undefined,
  sessionId: string,
  postEvent: PostEventFn,
  onError: (error: unknown) => void,
  getAgentSessionId?: () => string | undefined
): EmitFn {
  let sequence = 0

  return (event: DustWireEvent) => {
    if (!eventsUrl) return
    sequence++

    const payload: EventPayload = {
      sequence,
      timestamp: new Date().toISOString(),
      sessionId,
      event,
    }

    // Include agent info for claude.* events
    if (event.type.startsWith('claude.')) {
      payload.agentType = 'claude'
      const agentSessionId = getAgentSessionId?.()
      if (agentSessionId) {
        payload.agentSessionId = agentSessionId
      }
    }

    postEvent(eventsUrl, payload).catch(onError)
  }
}

const SLEEP_INTERVAL_MS = 30000
const DEFAULT_MAX_ITERATIONS = 10

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

    proc.on('error', error => {
      resolve({ success: false, message: error.message })
    })
  })
}

export async function hasAvailableTasks(
  dependencies: CommandDependencies
): Promise<boolean> {
  let hasOutput = false
  const captureContext = {
    ...dependencies.context,
    stdout: () => {
      hasOutput = true
    },
  }
  await next({ ...dependencies, context: captureContext })
  return hasOutput
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
  emit: EmitFn,
  options: IterationOptions = {}
): Promise<IterationResult> {
  const { context } = dependencies
  const { spawn, run } = loopDependencies

  const { onRawEvent } = options

  // Step 1: Sync with remote
  emit({ type: 'loop.syncing' })
  const pullResult = await gitPull(context.cwd, spawn)
  if (!pullResult.success) {
    emit({
      type: 'loop.sync_skipped',
      /* v8 ignore next - message is always set when success is false */
      reason: pullResult.message ?? 'unknown error',
    })

    emit({ type: 'claude.started' })
    const prompt = `git pull failed with the following error:

${pullResult.message}

Please resolve this issue. Common approaches:
1. If there are merge conflicts, resolve them
2. If local commits need to be rebased, use git rebase
3. After resolving, commit any changes and push to remote

Make sure the repository is in a clean state and synced with remote before finishing.`

    try {
      await run(prompt, {
        spawnOptions: {
          cwd: context.cwd,
          dangerouslySkipPermissions: true,
          env: { DUST_UNATTENDED: '1' },
        },
        onRawEvent,
      })
      emit({ type: 'claude.ended', success: true })
      return 'resolved_pull_conflict'
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      context.stderr(
        `Claude failed to resolve git pull conflict: ${errorMessage}`
      )
      emit({ type: 'claude.ended', success: false, error: errorMessage })
    }
  }

  // Step 2: Check for available tasks
  emit({ type: 'loop.checking_tasks' })
  const hasTasks = await hasAvailableTasks(dependencies)

  if (!hasTasks) {
    emit({ type: 'loop.no_tasks' })
    return 'no_tasks'
  }

  // Step 3: Invoke Claude Code
  emit({ type: 'loop.tasks_found' })
  emit({ type: 'claude.started' })

  try {
    await run('go', {
      spawnOptions: {
        cwd: context.cwd,
        dangerouslySkipPermissions: true,
        env: { DUST_UNATTENDED: '1' },
      },
      onRawEvent,
    })
    emit({ type: 'claude.ended', success: true })
    return 'ran_claude'
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    context.stderr(`Claude exited with error: ${errorMessage}`)
    emit({ type: 'claude.ended', success: false, error: errorMessage })
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
  const postEventFn = createEventPoster(
    eventsUrl,
    sessionId,
    postEvent,
    error => {
      const message = error instanceof Error ? error.message : String(error)
      context.stderr(`Event POST failed: ${message}`)
    },
    () => agentSessionId
  )

  const emit: EmitFn = event => {
    const formatted = formatEvent(event)
    if (formatted !== null) {
      context.stdout(formatted)
    }
    postEventFn(event)
  }

  emit({ type: 'loop.warning' })
  emit({ type: 'loop.started', maxIterations })
  context.stdout('   Press Ctrl+C to stop')
  context.stdout('')

  let completedIterations = 0
  // Build iteration options
  const iterationOptions: IterationOptions = {}
  if (eventsUrl) {
    iterationOptions.onRawEvent = (rawEvent: Record<string, unknown>) => {
      // Extract session_id from any event that has it
      if (typeof rawEvent.session_id === 'string' && rawEvent.session_id) {
        agentSessionId = rawEvent.session_id
      }
      emit({ type: 'claude.raw_event', rawEvent })
    }
  }

  while (completedIterations < maxIterations) {
    agentSessionId = undefined
    const result = await runOneIteration(
      dependencies,
      loopDependencies,
      emit,
      iterationOptions
    )

    if (result === 'no_tasks') {
      await loopDependencies.sleep(SLEEP_INTERVAL_MS)
    } else {
      // Count iterations where Claude actually ran (ran_claude, claude_error, resolved_pull_conflict)
      completedIterations++
      emit({
        type: 'loop.iteration_complete',
        iteration: completedIterations,
        maxIterations,
      })
    }
  }

  emit({ type: 'loop.ended', maxIterations })
  return { exitCode: 0 }
}

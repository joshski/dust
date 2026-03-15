import { spawn as nodeSpawn } from 'node:child_process'
import os from 'node:os'
import { run as claudeRun } from '../claude/run'
import type { DockerSpawnConfig } from '../claude/types'
import type { DockerDependencies } from '../docker/docker-agent'
import { createLogger } from '../logging'
import { buildUnattendedEnv } from '../session'
import { DUST_VERSION } from '../version'
import type { CommandDependencies } from '../cli/types'
import { buildImplementationInstructions } from '../cli/commands/focus'
import {
  findUnblockedTasks,
  type InvalidTask,
  printSkippedTasks,
  type UnblockedTask,
} from '../cli/commands/next'
import type { LoopEmitFn } from './events'
import { gitPull } from './git-pull'
import type { PostEventFn, SendAgentEventFn } from './wire-events'
import { createPostEvent } from './wire-events'

const log = createLogger('dust:loop:iteration')

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

export function createDefaultDependencies(): LoopDependencies {
  return {
    spawn: nodeSpawn,
    run: claudeRun,
    sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    postEvent: createPostEvent(fetch),
  }
}

type IterationResult =
  | 'no_tasks'
  | 'ran_claude'
  | 'claude_error'
  | 'resolved_pull_conflict'

type LogFn = (message: string) => void

export interface IterationOptions {
  onRawEvent?: (rawEvent: Record<string, unknown>) => void
  hooksInstalled?: boolean
  signal?: AbortSignal
  logger?: LogFn
  repositoryId?: string
  /** Docker spawn config when running in Docker mode */
  docker?: DockerSpawnConfig
  /** Pre-formatted tools section to inject into the prompt */
  toolsSection?: string
  /** Port of the command events proxy for this iteration */
  proxyPort?: number
}

export async function findAvailableTasks(
  dependencies: CommandDependencies
): Promise<{ tasks: UnblockedTask[]; invalidTasks: InvalidTask[] }> {
  const { context, fileSystem, directoryFileSorter } = dependencies
  const result = await findUnblockedTasks(
    context.cwd,
    fileSystem,
    directoryFileSorter
  )
  return { tasks: result.tasks, invalidTasks: result.invalidTasks }
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
    toolsSection = '',
  } = options
  const baseEnv = buildUnattendedEnv({
    repositoryId,
    proxyPort: options.proxyPort,
  })

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
  const { tasks, invalidTasks } = await findAvailableTasks(dependencies)

  if (tasks.length === 0) {
    log('no tasks available')
    if (invalidTasks.length > 0) {
      printSkippedTasks(context, invalidTasks)
    }
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
  const { dustCommand, installCommand } = dependencies.settings
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

${instructions}${toolsSection ? `\n${toolsSection}` : ''}`

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

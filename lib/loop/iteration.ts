import { spawn as nodeSpawn } from 'node:child_process'
import os from 'node:os'
import { run as claudeRun } from '../claude/run'
import type { DockerSpawnConfig, SpawnOptions } from '../claude/types'
import type { DockerDependencies } from '../docker/docker-agent'
import { readEnvConfig, type SessionConfig } from '../env-config'
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
  session: SessionConfig
  agentType?: string
  fetch?: typeof fetch
  /** Optional overrides for Docker dependency functions (for testing) */
  dockerDeps?: Partial<DockerDependencies>
}

export function createDefaultDependencies(): LoopDependencies {
  const envConfig = readEnvConfig(process.env)
  return {
    spawn: nodeSpawn,
    run: claudeRun,
    sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    postEvent: createPostEvent(fetch),
    session: envConfig.session,
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

/** Parameters for running the agent (extracted for reduced complexity) */
interface AgentRunParams {
  run: typeof claudeRun
  prompt: string
  spawnOptions: SpawnOptions
  onRawEvent?: (rawEvent: Record<string, unknown>) => void
}

/**
 * Attempt to resolve a git conflict by running the agent.
 * Returns the iteration result if conflict was handled, undefined to continue.
 */
async function handleGitConflict(
  pullErrorMessage: string,
  runParameters: AgentRunParams,
  onAgentEvent: SendAgentEventFn | undefined,
  context: { cwd: string; stderr: (msg: string) => void },
  agentName: string,
  agentType: string
): Promise<IterationResult | undefined> {
  log(`git pull failed: ${pullErrorMessage}`)

  onAgentEvent?.({
    type: 'agent-session-started',
    title: 'Resolving git conflict',
    prompt: runParameters.prompt,
    agentType,
    purpose: 'git-conflict',
    ...getEnvironmentContext(context.cwd),
  })

  try {
    await runParameters.run(runParameters.prompt, {
      spawnOptions: runParameters.spawnOptions,
      onRawEvent: runParameters.onRawEvent,
    })
    onAgentEvent?.({ type: 'agent-session-ended', success: true })
    return 'resolved_pull_conflict'
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    context.stderr(
      `${agentName} failed to resolve git pull conflict: ${errorMessage}`
    )
    onAgentEvent?.({
      type: 'agent-session-ended',
      success: false,
      error: errorMessage,
    })
    return undefined
  }
}

/**
 * Execute a task by running the agent.
 */
async function executeTask(
  task: UnblockedTask,
  runParameters: AgentRunParams,
  onAgentEvent: SendAgentEventFn | undefined,
  context: { cwd: string; stderr: (msg: string) => void },
  agentName: string,
  agentType: string,
  logger: LogFn
): Promise<IterationResult> {
  const taskName = task.title ?? task.path

  onAgentEvent?.({
    type: 'agent-session-started',
    title: taskName,
    prompt: runParameters.prompt,
    agentType,
    purpose: 'task',
    ...getEnvironmentContext(context.cwd),
  })

  try {
    await runParameters.run(runParameters.prompt, {
      spawnOptions: runParameters.spawnOptions,
      onRawEvent: runParameters.onRawEvent,
    })
    log(`${agentName} completed task: ${taskName}`)
    onAgentEvent?.({ type: 'agent-session-ended', success: true })
    return 'ran_claude'
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger(`${agentName} error on task ${taskName}: ${errorMessage}`)
    context.stderr(`${agentName} exited with error: ${errorMessage}`)
    onAgentEvent?.({
      type: 'agent-session-ended',
      success: false,
      error: errorMessage,
    })
    return 'claude_error'
  }
}

export async function runOneIteration(
  dependencies: CommandDependencies,
  loopDependencies: LoopDependencies,
  onLoopEvent: LoopEmitFn,
  onAgentEvent?: SendAgentEventFn,
  options: IterationOptions = {}
): Promise<IterationResult> {
  const { context, fileSystem, settings } = dependencies
  const { spawn, run } = loopDependencies
  const agentName = loopDependencies.agentType === 'codex' ? 'Codex' : 'Claude'
  const agentType = loopDependencies.agentType ?? 'claude'
  const { onRawEvent, hooksInstalled, signal, logger, repositoryId, docker } = {
    hooksInstalled: false,
    logger: log,
    ...options,
  }
  const toolsSection = options.toolsSection ?? ''

  const baseEnv = buildUnattendedEnv({
    repositoryId,
    proxyPort: options.proxyPort,
    session: loopDependencies.session,
  })

  const spawnOptions: SpawnOptions = {
    cwd: context.cwd,
    dangerouslySkipPermissions: true,
    env: baseEnv,
    signal,
    docker,
  }

  // Step 1: Sync with remote
  log('syncing with remote')
  onLoopEvent({ type: 'loop.syncing' })
  const pullResult = await gitPull(context.cwd, spawn)

  if (!pullResult.success) {
    onLoopEvent({ type: 'loop.sync_skipped', reason: pullResult.message })
    const conflictPrompt = buildGitConflictPrompt(pullResult.message)
    const conflictResult = await handleGitConflict(
      pullResult.message,
      { run, prompt: conflictPrompt, spawnOptions, onRawEvent },
      onAgentEvent,
      context,
      agentName,
      agentType
    )
    if (conflictResult) {
      return conflictResult
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

  // Step 3: Invoke the agent with the first available task
  const task = tasks[0]
  log(`found ${tasks.length} task(s), picking: ${task.title ?? task.path}`)
  onLoopEvent({ type: 'loop.tasks_found' })

  const taskContent = await fileSystem.readFile(`${context.cwd}/${task.path}`)
  const instructions = buildImplementationInstructions(
    settings.dustCommand,
    hooksInstalled,
    task.title ?? undefined,
    task.path,
    settings.installCommand
  )
  const taskPrompt = buildTaskPrompt(
    task.path,
    taskContent,
    instructions,
    toolsSection
  )

  return executeTask(
    task,
    { run, prompt: taskPrompt, spawnOptions, onRawEvent },
    onAgentEvent,
    context,
    agentName,
    agentType,
    logger
  )
}

function buildGitConflictPrompt(errorMessage: string): string {
  return `Note: Do NOT run \`dust agent\`.

git pull failed with the following error:

${errorMessage}

Please resolve this issue. Common approaches:
1. If there are merge conflicts, resolve them
2. If local commits need to be rebased, use git rebase
3. After resolving, commit any changes and push to remote

Make sure the repository is in a clean state and synced with remote before finishing.`
}

function buildTaskPrompt(
  taskPath: string,
  taskContent: string,
  instructions: string,
  toolsSection: string
): string {
  const suffix = toolsSection ? `\n${toolsSection}` : ''
  return `Implement the task at \`${taskPath}\`:

----------
${taskContent}
----------

## How to implement the task

${instructions}${suffix}`
}

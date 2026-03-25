/**
 * Generic loop orchestrator for continuous agent iteration on tasks.
 *
 * Runs an agent (Claude, Codex, etc.) in a loop:
 * 1. Sync with remote (git pull)
 * 2. Check for available tasks via `dust next`
 * 3. If no tasks, sleep and retry
 * 4. If tasks available, invoke the agent
 * 5. Repeat until max iterations reached (default: 10)
 */

import { existsSync, writeFileSync, unlinkSync } from 'node:fs'
import os from 'node:os'
import { join } from 'node:path'
import { createHeartbeatThrottler, formatAgentEvent } from '../agent-events'
import { generateApiKeyHelperSettings } from '../claude/spawn-claude-code'
import type { DockerSpawnConfig } from '../claude/types'
import {
  type DockerDependencies,
  prepareContainerConfigWithRuntime,
} from '../docker/docker-agent'
import type { ContainerRuntime } from '../container/runtime'
import { selectContainerRuntime } from '../container/select-runtime'
import { createLogger, enableFileLogs } from '../logging'
import { createClaudeApiProxyServer } from '../proxy/claude-api-proxy'
import { createGitCredentialProxyServer } from '../proxy/git-credential-proxy'
import { isUnattended } from '../session'
import type { CommandDependencies, CommandResult } from '../cli/types'
import { manageGitHooks } from '../cli/shared/agent-shared'
import { formatLoopEvent } from './events'
import type { LoopEmitFn } from './events'
import {
  type LoopDependencies,
  type IterationOptions,
  runOneIteration,
} from './iteration'
import type { SendAgentEventFn } from './wire-events'
import { createWireEventSender } from './wire-events'
import { parseLoopArgs } from './parse-args'
import { sleepWithProgress, SLEEP_INTERVAL_MS } from './sleep'

const log = createLogger('dust:loop')

interface DockerProxyConfig {
  dockerConfig: DockerSpawnConfig
  stopGitProxy: () => void
  stopApiProxy?: () => void
  settingsFilePath?: string
}

async function setupDockerProxies(
  dockerResult: { config: DockerSpawnConfig },
  loopDependencies: LoopDependencies,
  sessionId: string,
  includeClaudeApiProxy: boolean
): Promise<DockerProxyConfig> {
  const gitProxy = await createGitCredentialProxyServer({
    spawn: loopDependencies.spawn,
    userHome: process.env.DUST_USER_HOME || undefined,
  })

  const hostAddress = dockerResult.config.hostAddress ?? 'host.docker.internal'
  const dockerConfig: DockerSpawnConfig = {
    ...dockerResult.config,
    gitProxyUrl: `http://${hostAddress}:${gitProxy.port}`,
  }
  let stopApiProxy: (() => void) | undefined
  let settingsFilePath: string | undefined

  if (includeClaudeApiProxy) {
    const apiProxy = await createClaudeApiProxyServer()
    stopApiProxy = apiProxy.stop
    const claudeApiProxyUrl = `http://${hostAddress}:${apiProxy.port}`

    settingsFilePath = join(
      os.tmpdir(),
      `dust-claude-settings-${sessionId}.json`
    )
    const settingsContent = generateApiKeyHelperSettings(claudeApiProxyUrl)
    writeFileSync(settingsFilePath, settingsContent, 'utf-8')
    log(`created settings file at ${settingsFilePath}`)
    dockerConfig.claudeApiProxyUrl = claudeApiProxyUrl
    dockerConfig.settingsFilePath = settingsFilePath
  }

  return {
    dockerConfig,
    stopGitProxy: gitProxy.stop,
    stopApiProxy,
    settingsFilePath,
  }
}

function resolveDockerDependencies(
  loopDependencies: LoopDependencies
): DockerDependencies {
  return {
    spawn: loopDependencies.dockerDeps?.spawn ?? loopDependencies.spawn,
    homedir: loopDependencies.dockerDeps?.homedir ?? os.homedir,
    existsSync: loopDependencies.dockerDeps?.existsSync ?? existsSync,
  }
}

type ContainerSetupResult =
  | { dockerProxies: DockerProxyConfig; dockerConfig: DockerSpawnConfig }
  | { exitCode: 1 }
  | undefined

async function setupContainerProxies(
  dockerResult: Awaited<ReturnType<typeof prepareContainerConfigWithRuntime>>,
  containerRuntime: ContainerRuntime | null | undefined,
  loopDependencies: LoopDependencies,
  sessionId: string
): Promise<ContainerSetupResult> {
  if (!('config' in dockerResult)) {
    return undefined
  }
  const isCodexLoop = loopDependencies.agentType === 'codex'
  if (!isCodexLoop && !process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return { exitCode: 1 }
  }
  const typedResult = dockerResult as { config: DockerSpawnConfig }
  Object.assign(typedResult.config, {
    runCommand: containerRuntime?.runCommand,
    hostAddress: containerRuntime?.hostAddress,
  })
  const dockerProxies = await setupDockerProxies(
    typedResult,
    loopDependencies,
    sessionId,
    !isCodexLoop
  )
  return { dockerProxies, dockerConfig: dockerProxies.dockerConfig }
}

export async function runLoop(
  dependencies: CommandDependencies,
  loopDependencies: LoopDependencies
): Promise<CommandResult> {
  enableFileLogs('loop')
  const { context, settings } = dependencies

  if (isUnattended(loopDependencies.session)) {
    context.stderr(
      'dust loop cannot run inside an unattended session (DUST_UNATTENDED is set)'
    )
    return { exitCode: 1 }
  }
  const { postEvent } = loopDependencies
  const parseResult = parseLoopArgs(dependencies.arguments)
  if (!parseResult.success) {
    context.stderr(parseResult.error)
    return { exitCode: 1 }
  }
  const { maxIterations, docker, appleContainer } = parseResult.args

  // Select container runtime based on flags
  const runtimeResult = selectContainerRuntime({ docker, appleContainer })
  /* istanbul ignore next @preserve -- parseLoopArgs already validates mutual exclusivity */
  if (!runtimeResult.success) {
    context.stderr(runtimeResult.error)
    return { exitCode: 1 }
  }
  const { runtime: containerRuntime, forceContainer } = runtimeResult

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

  // Check for Docker mode (.dust/config/container/Dockerfile)
  let dockerConfig: DockerSpawnConfig | undefined
  const dockerDeps = resolveDockerDependencies(loopDependencies)

  const dockerResult = await prepareContainerConfigWithRuntime(
    context.cwd,
    dockerDeps,
    onLoopEvent,
    containerRuntime,
    { forceContainer }
  )

  if ('error' in dockerResult) {
    context.stderr(dockerResult.error)
    return { exitCode: 1 }
  }

  const containerSetup = await setupContainerProxies(
    dockerResult,
    containerRuntime,
    loopDependencies,
    sessionId
  )
  if (containerSetup && 'exitCode' in containerSetup) {
    context.stderr(
      'Docker mode requires CLAUDE_CODE_OAUTH_TOKEN. Run `claude setup-token` and export the token.'
    )
    return { exitCode: 1 }
  }
  const dockerProxies = containerSetup?.dockerProxies
  dockerConfig = containerSetup?.dockerConfig

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
    iterationOptions.onRawEvent = createHeartbeatThrottler(
      onAgentEvent,
      loopDependencies.agentType ?? 'claude'
    )
  }

  while (completedIterations < maxIterations) {
    agentSessionId = crypto.randomUUID()
    const traceId = agentSessionId // Reuse agentSessionId as trace ID
    const result = await runOneIteration(
      dependencies,
      loopDependencies,
      onLoopEvent,
      onAgentEvent,
      { ...iterationOptions, traceId }
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
      // Count iterations where the agent actually ran (ran_claude, claude_error, resolved_pull_conflict)
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

  // Stop proxy servers and clean up temp files
  dockerProxies?.stopGitProxy()
  dockerProxies?.stopApiProxy?.()
  if (dockerProxies?.settingsFilePath) {
    try {
      unlinkSync(dockerProxies.settingsFilePath)
      log(`cleaned up settings file ${dockerProxies.settingsFilePath}`)
    } catch {
      // Ignore cleanup errors
    }
  }
  log(`loop ended after ${completedIterations} iterations`)
  onLoopEvent({ type: 'loop.ended', maxIterations })
  return { exitCode: 0 }
}

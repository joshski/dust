/**
 * Loop orchestration for dust bucket repositories.
 *
 * Manages the async loop that picks tasks and runs Claude sessions
 * for a single repository.
 */

import { existsSync as fsExistsSync } from 'node:fs'
import os from 'node:os'
import type { AgentSessionEvent, EventMessage } from '../agent-events'
import { createHeartbeatThrottler, formatAgentEvent } from '../agent-events'
import {
  type run as claudeRun,
  defaultRunnerDependencies,
  type RunnerDependencies,
} from '../claude/run'
import type { DockerSpawnConfig, OutputSink } from '../claude/types'
import { manageGitHooks } from '../cli/shared/agent-shared'
import {
  formatLoopEvent,
  type LoopEmitFn,
  type LoopEvent,
} from '../loop/events'
import { type LoopDependencies, runOneIteration } from '../loop/iteration'
import type { SendAgentEventFn } from '../loop/wire-events'
import type { CommandDependencies } from '../cli/types'
import {
  type RunnerDependencies as CodexRunnerDependencies,
  defaultRunnerDependencies as codexDefaultRunnerDependencies,
  run as codexRun,
} from '../codex/run'
import { defaultDependencies as codexSpawnDefaultDependencies } from '../codex/spawn-codex'
import { loadSettings } from '../config/settings'
import { prepareDockerConfig } from '../docker/docker-agent'
import { createLogger } from '../logging'
import { createClaudeApiProxyServer } from '../proxy/claude-api-proxy'
import { createGitCredentialProxyServer } from '../proxy/git-credential-proxy'
import { startCommandEventsProxy } from './command-events-proxy'
import type { SendEventFn } from './events'
import { appendLogLine, createLogLine, type LogBuffer } from './log-buffer'
import type { RepositoryDependencies, RepositoryState } from './repository'
import { formatToolsSection } from './tool-prompt'

const log = createLogger('dust:bucket:repository-loop')

const FALLBACK_TIMEOUT_MS = 300000

/**
 * Create stdout/stderr callbacks that append to a log buffer.
 * Extracted for testability (v8 coverage limitation on inline callbacks).
 */
export function createLogCallbacks(logBuffer: LogBuffer): {
  stdout: (msg: string) => void
  stderr: (msg: string) => void
} {
  return {
    stdout: (msg: string) =>
      appendLogLine(logBuffer, createLogLine(msg, 'stdout')),
    stderr: (msg: string) =>
      appendLogLine(logBuffer, createLogLine(msg, 'stderr')),
  }
}

/**
 * Flush any pending partial line and log all segments of multi-line text.
 * Returns the new partial line state (always empty string after flush).
 * Extracted for testability (v8 coverage limitation on inline callbacks).
 */
export function flushAndLogMultiLine(
  partialLine: string,
  text: string,
  logBuffer: LogBuffer
): string {
  // Flush any pending partial text first
  if (partialLine) {
    appendLogLine(logBuffer, createLogLine(partialLine, 'stdout'))
  }
  // Split multi-line content (e.g. tool_result file contents)
  // into separate log lines
  for (const segment of text.split('\n')) {
    appendLogLine(logBuffer, createLogLine(segment, 'stdout'))
  }
  return ''
}

/**
 * Build an EventMessage from agent session event data.
 * Extracted for testability (v8 coverage limitation on inline callbacks).
 */
export function buildEventMessage(parameters: {
  sequence: number
  sessionId: string
  repository: string
  repoId?: number
  event: EventMessage['event']
  agentSessionId?: string
}): EventMessage {
  const msg: EventMessage = {
    sequence: parameters.sequence,
    timestamp: new Date().toISOString(),
    sessionId: parameters.sessionId,
    repository: parameters.repository,
    event: parameters.event,
  }
  if (parameters.repoId !== undefined) {
    msg.repoId = parameters.repoId
  }
  if (parameters.agentSessionId) {
    msg.agentSessionId = parameters.agentSessionId
  }
  return msg
}

/**
 * Create a wake-up handler that resolves the wait promise.
 * The handler guards against being called after a newer wait has started.
 * Extracted for testability (v8 coverage limitation on inline callbacks).
 */
export function createWakeUpHandler(
  repoState: RepositoryState,
  resolve: () => void
): () => void {
  const handler = () => {
    if (repoState.wakeUp !== handler) {
      return
    }
    repoState.wakeUp = undefined
    resolve()
  }
  return handler
}

/* v8 ignore start */
async function* noOpScan() {
  // no-op
}
/* v8 ignore stop */

/**
 * Create a no-op glob scanner for CommandDependencies.
 * The `next` command only uses fileSystem, not globScanner.
 */
function createNoOpGlobScanner() {
  return {
    scan: noOpScan,
  }
}

/** Mutable state shared across loop iteration callbacks. */
export interface LoopState {
  partialLine: string
  sequence: number
  agentSessionId: string | undefined
}

/**
 * Create an OutputSink that buffers stdout and logs complete lines.
 */
export function createBufferStdoutSink(
  loopState: LoopState,
  logBuffer: LogBuffer
): OutputSink {
  return {
    write(text: string) {
      loopState.partialLine += text
      const lines = loopState.partialLine.split('\n')
      // All complete lines get flushed; last segment is the pending partial
      for (let i = 0; i < lines.length - 1; i++) {
        appendLogLine(logBuffer, createLogLine(lines[i], 'stdout'))
      }
      loopState.partialLine = lines[lines.length - 1]
    },
    line(text: string) {
      loopState.partialLine = flushAndLogMultiLine(
        loopState.partialLine,
        text,
        logBuffer
      )
    },
  }
}

/**
 * Create a factory function that produces OutputSinks for agent runners.
 * This factory captures loopState and logBuffer, returning a function
 * that can be passed to RunnerDependencies.createStdoutSink.
 */
export function createStdoutSinkFactory(
  loopState: LoopState,
  logBuffer: LogBuffer
): () => OutputSink {
  return () => createBufferStdoutSink(loopState, logBuffer)
}

/**
 * Create a run function that redirects Claude output to a log buffer.
 */
export function createBufferRun(
  run: RepositoryDependencies['run'],
  bufferSinkDeps: RunnerDependencies
): typeof claudeRun {
  return (prompt, options) => run(prompt, options, bufferSinkDeps)
}

/**
 * Create a run function that redirects Codex output to a log buffer.
 */
export function createCodexBufferRun(
  run: typeof codexRun,
  codexBufferSinkDeps: CodexRunnerDependencies
): typeof claudeRun {
  return ((prompt, options) =>
    run(prompt, options, codexBufferSinkDeps)) as typeof claudeRun
}

/** No-op postEvent for LoopDependencies. */
export async function noOpPostEvent() {}

/**
 * Create a handler that logs formatted loop events to a log buffer.
 */
export function createLoopEventHandler(logBuffer: LogBuffer): LoopEmitFn {
  return function onLoopEvent(event: LoopEvent) {
    const formatted = formatLoopEvent(event)
    if (formatted !== null) {
      appendLogLine(logBuffer, createLogLine(formatted, 'stdout'))
    }
  }
}

/**
 * Create a handler that logs formatted agent events and sends them over WebSocket.
 */
export function createAgentEventHandler(parameters: {
  repoState: RepositoryState
  sendEvent?: SendEventFn
  sessionId?: string
  repoName: string
  loopState: LoopState
}): SendAgentEventFn {
  const { repoState, sendEvent, sessionId, repoName, loopState } = parameters
  return function onAgentEvent(event: AgentSessionEvent) {
    if (event.type === 'agent-session-started') {
      repoState.agentStatus = 'busy'
    } else if (event.type === 'agent-session-ended') {
      repoState.agentStatus = 'idle'
    }

    const formatted = formatAgentEvent(event)
    if (formatted !== null) {
      appendLogLine(repoState.logBuffer, createLogLine(formatted, 'stdout'))
    }

    if (sendEvent && sessionId) {
      loopState.sequence++
      sendEvent(
        buildEventMessage({
          sequence: loopState.sequence,
          sessionId,
          repository: repoName,
          repoId: repoState.repository.id,
          event,
          agentSessionId: loopState.agentSessionId,
        })
      )
    }
  }
}

/**
 * Create a cancel handler that aborts the given controller.
 */
export function createCancelHandler(
  abortController: AbortController
): () => void {
  return abortController.abort.bind(abortController)
}

/**
 * Set up the fallback timeout for the no-tasks wait.
 * Resolves the wait if this exact handler is still active after the timeout.
 */
export function setupFallbackTimeout(
  repoState: RepositoryState,
  sleep: RepositoryDependencies['sleep'],
  resolve: () => void,
  wakeUpForThisWait: () => void
): void {
  sleep(FALLBACK_TIMEOUT_MS).then(function onFallbackTimeout() {
    if (repoState.wakeUp === wakeUpForThisWait) {
      repoState.wakeUp = undefined
      resolve()
    }
  })
}

/**
 * Run the async loop for a single repository.
 */
export async function runRepositoryLoop(
  repoState: RepositoryState,
  repoDeps: RepositoryDependencies,
  sendEvent?: SendEventFn,
  sessionId?: string
): Promise<void> {
  const { spawn, run, fileSystem, sleep, runtime } = repoDeps
  const repoName = repoState.repository.name

  // Build CommandDependencies for runOneIteration
  const settings = await loadSettings(repoState.path, fileSystem, runtime)
  const logCallbacks = createLogCallbacks(repoState.logBuffer)
  const commandDeps: CommandDependencies = {
    arguments: [],
    context: {
      cwd: repoState.path,
      stdout: logCallbacks.stdout,
      stderr: logCallbacks.stderr,
    },
    fileSystem,
    globScanner: createNoOpGlobScanner(),
    settings,
    runtime,
  }

  // Wrap run to redirect agent output to the repo's log buffer
  // instead of writing directly to process.stdout
  const loopState: LoopState = {
    partialLine: '',
    sequence: 0,
    agentSessionId: undefined,
  }

  const onLoopEvent = createLoopEventHandler(repoState.logBuffer)

  const onAgentEvent = createAgentEventHandler({
    repoState,
    sendEvent,
    sessionId,
    repoName,
    loopState,
  })

  // Install git hooks before starting iterations
  const hooksInstalled = await manageGitHooks(commandDeps)

  // Check for Docker mode (.dust/Dockerfile)
  let dockerConfig: DockerSpawnConfig | undefined
  let stopGitProxy: (() => void) | undefined
  let stopApiProxy: (() => void) | undefined
  const dockerDeps = {
    spawn: repoDeps.dockerDeps?.spawn ?? spawn,
    homedir: repoDeps.dockerDeps?.homedir ?? os.homedir,
    existsSync: repoDeps.dockerDeps?.existsSync ?? fsExistsSync,
  }

  const dockerResult = await prepareDockerConfig(
    repoState.path,
    dockerDeps,
    onLoopEvent
  )

  if ('error' in dockerResult) {
    log(`Docker error: ${dockerResult.error}`)
    appendLogLine(
      repoState.logBuffer,
      createLogLine(dockerResult.error, 'stderr')
    )
  } else if ('config' in dockerResult) {
    /* v8 ignore start -- Docker mode requires complex setup with real Docker */
    if (!repoDeps.auth.claudeCodeOauthToken) {
      log('CLAUDE_CODE_OAUTH_TOKEN is not set, cannot run in Docker mode')
      appendLogLine(
        repoState.logBuffer,
        createLogLine(
          'Docker mode requires CLAUDE_CODE_OAUTH_TOKEN. Run `claude setup-token` and export the token.',
          'stderr'
        )
      )
      return
    }

    // Start proxies for Docker containers — secrets stay on the host
    const gitProxy = await createGitCredentialProxyServer({ spawn })
    stopGitProxy = gitProxy.stop
    log(`git credential proxy started on port ${gitProxy.port}`)

    const apiProxy = await createClaudeApiProxyServer()
    stopApiProxy = apiProxy.stop
    log(`claude api proxy started on port ${apiProxy.port}`)

    dockerConfig = {
      ...dockerResult.config,
      gitProxyUrl: `http://host.docker.internal:${gitProxy.port}`,
      claudeApiProxyUrl: `http://host.docker.internal:${apiProxy.port}`,
    }
    /* v8 ignore stop */
  }

  log(`loop started for ${repoName} at ${repoState.path}`)

  while (!repoState.stopRequested) {
    loopState.agentSessionId = crypto.randomUUID()

    // Select agent based on agentProvider (re-read each iteration so changes take effect)
    const isCodex = repoState.repository.agentProvider === 'codex'
    const agentType = isCodex ? 'codex' : 'claude'
    log(
      `${repoName}: agentProvider=${repoState.repository.agentProvider ?? '(unset)'}, using ${agentType}`
    )

    // Shared sink creation for both agent types
    const createStdoutSink = createStdoutSinkFactory(
      loopState,
      repoState.logBuffer
    )

    let bufferRun: typeof claudeRun
    if (isCodex) {
      const codexBufferSinkDeps: CodexRunnerDependencies = {
        ...codexDefaultRunnerDependencies,
        spawnCodex: (prompt, options = {}) => {
          const spawnDeps = {
            ...codexSpawnDefaultDependencies,
            spawn,
          }
          return codexDefaultRunnerDependencies.spawnCodex(
            prompt,
            options,
            spawnDeps
          )
        },
        createStdoutSink,
      }
      bufferRun = createCodexBufferRun(codexRun, codexBufferSinkDeps)
    } else {
      const bufferSinkDeps: RunnerDependencies = {
        ...defaultRunnerDependencies,
        createStdoutSink,
      }
      bufferRun = createBufferRun(run, bufferSinkDeps)
    }

    const loopDeps: LoopDependencies = {
      spawn,
      run: bufferRun,
      sleep,
      postEvent: noOpPostEvent,
      session: repoDeps.session,
      agentType,
    }
    const abortController = new AbortController()
    const cancelCurrentIteration = createCancelHandler(abortController)
    repoState.cancelCurrentIteration = cancelCurrentIteration
    let result: Awaited<ReturnType<typeof runOneIteration>>
    // Get current tools and format for prompt injection
    const tools = repoDeps.getTools?.() ?? []
    const toolsSection = formatToolsSection(tools)

    // Start a per-iteration command events proxy so subprocesses can send
    // command events (e.g. principles-listed, check-passed) enriched with
    // the correct session/repository context.
    /* v8 ignore start -- proxy callbacks only invoked by real subprocesses */
    const proxy = await startCommandEventsProxy({
      forwardEvent: commandEvent => {
        if (sendEvent && sessionId) {
          loopState.sequence++
          sendEvent(
            buildEventMessage({
              sequence: loopState.sequence,
              sessionId,
              repository: repoName,
              repoId: repoState.repository.id,
              event: {
                type: 'command-event',
                commandEvent: commandEvent.event,
              },
              agentSessionId: loopState.agentSessionId,
            })
          )
        }
      },
      getTools: () => repoDeps.getTools?.() ?? [],
      forwardToolExecution:
        repoDeps.forwardToolExecution ??
        (() =>
          Promise.resolve({
            status: 'error' as const,
            error: 'Tool execution not available',
          })),
      revealFamily: repoDeps.revealFamily,
    })
    /* v8 ignore stop */

    try {
      result = await runOneIteration(
        commandDeps,
        loopDeps,
        onLoopEvent,
        onAgentEvent,
        {
          hooksInstalled,
          signal: abortController.signal,
          repositoryId: repoState.repository.id.toString(),
          onRawEvent: createHeartbeatThrottler(onAgentEvent, agentType),
          docker: dockerConfig,
          toolsSection,
          proxyPort: proxy.port,
        }
      )
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      log(`iteration error for ${repoName}: ${msg}`)
      appendLogLine(
        repoState.logBuffer,
        createLogLine(`Loop error: ${msg}`, 'stderr')
      )
      // Wait before retrying to avoid tight error loops
      await sleep(10000)
      continue
    } finally {
      await proxy.stop()
      if (repoState.cancelCurrentIteration === cancelCurrentIteration) {
        repoState.cancelCurrentIteration = undefined
      }
    }

    if (result === 'no_tasks') {
      // Check if a task-available signal arrived while we were busy
      if (repoState.taskAvailablePending) {
        repoState.taskAvailablePending = false
        log(`${repoName}: task signal received during iteration, rechecking`)
        appendLogLine(
          repoState.logBuffer,
          createLogLine(
            'Task signal received during iteration, rechecking...',
            'stdout'
          )
        )
        continue
      }

      log(`${repoName}: no tasks available, waiting`)
      appendLogLine(
        repoState.logBuffer,
        createLogLine('Waiting for tasks...', 'stdout')
      )
      await new Promise<void>(function waitForTasks(resolve) {
        const wakeUpForThisWait = createWakeUpHandler(repoState, resolve)
        repoState.wakeUp = wakeUpForThisWait
        // Fallback timeout so the loop isn't stuck forever if no signal arrives
        setupFallbackTimeout(repoState, sleep, resolve, wakeUpForThisWait)
      })
    }
  }

  /* v8 ignore start -- Proxy cleanup only runs in Docker mode */
  if (stopGitProxy) {
    stopGitProxy()
    log(`git credential proxy stopped for ${repoName}`)
  }
  if (stopApiProxy) {
    stopApiProxy()
    log(`claude api proxy stopped for ${repoName}`)
  }
  /* v8 ignore stop */

  log(`loop stopped for ${repoName}`)
  appendLogLine(
    repoState.logBuffer,
    createLogLine(`Stopped loop for ${repoName}`, 'stdout')
  )
}

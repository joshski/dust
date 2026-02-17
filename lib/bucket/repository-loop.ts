/**
 * Loop orchestration for dust bucket repositories.
 *
 * Manages the async loop that picks tasks and runs Claude sessions
 * for a single repository.
 */

import type { AgentSessionEvent, EventMessage } from '../agent-events'
import { formatAgentEvent, rawEventToAgentEvent } from '../agent-events'
import {
  type run as claudeRun,
  defaultRunnerDependencies,
  type RunnerDependencies,
} from '../claude/run'
import { manageGitHooks } from '../cli/commands/agent-shared'
import {
  formatLoopEvent,
  type LoopDependencies,
  type LoopEmitFn,
  type LoopEvent,
  runOneIteration,
  type SendAgentEventFn,
} from '../cli/commands/loop'
import type { CommandDependencies } from '../cli/types'
import { loadSettings } from '../config/settings'
import type { SendEventFn } from './events'
import { appendLogLine, createLogLine } from './log-buffer'
import type { RepositoryDependencies, RepositoryState } from './repository'

const FALLBACK_TIMEOUT_MS = 300000

/**
 * Create a no-op glob scanner for CommandDependencies.
 * The `next` command only uses fileSystem, not globScanner.
 */
function createNoOpGlobScanner() {
  return {
    scan: async function* () {
      // no-op
    },
  }
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

  // Track agent session ID per iteration
  let agentSessionId: string | undefined
  let sequence = 0

  // Log formatted loop events to the repo's log buffer
  const onLoopEvent: LoopEmitFn = (event: LoopEvent) => {
    const formatted = formatLoopEvent(event)
    if (formatted !== null) {
      appendLogLine(repoState.logBuffer, createLogLine(formatted, 'stdout'))
    }
  }

  // Log formatted agent events and send over WebSocket
  const onAgentEvent: SendAgentEventFn = (event: AgentSessionEvent) => {
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
      sequence++
      const msg: EventMessage = {
        sequence,
        timestamp: new Date().toISOString(),
        sessionId,
        repository: repoName,
        event,
      }
      if (agentSessionId) {
        msg.agentSessionId = agentSessionId
      }
      sendEvent(msg)
    }
  }

  // Install git hooks before starting iterations
  const hooksInstalled = await manageGitHooks(commandDeps)

  while (!repoState.stopRequested) {
    agentSessionId = crypto.randomUUID()
    const result = await runOneIteration(
      commandDeps,
      loopDeps,
      onLoopEvent,
      onAgentEvent,
      {
        hooksInstalled,
        onRawEvent: (rawEvent: Record<string, unknown>) => {
          onAgentEvent(rawEventToAgentEvent(rawEvent))
        },
      }
    )

    if (result === 'no_tasks') {
      await new Promise<void>(resolve => {
        repoState.wakeUp = () => {
          repoState.wakeUp = undefined
          resolve()
        }
        // Fallback timeout so the loop isn't stuck forever if no signal arrives
        sleep(FALLBACK_TIMEOUT_MS).then(() => {
          if (repoState.wakeUp) {
            repoState.wakeUp = undefined
            resolve()
          }
        })
      })
    }
  }

  appendLogLine(
    repoState.logBuffer,
    createLogLine(`Stopped loop for ${repoName}`, 'stdout')
  )
}

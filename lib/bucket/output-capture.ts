/**
 * Output capture for dust bucket subprocess invocations.
 *
 * Captures stdout/stderr from subprocess invocations, parses Claude's JSON
 * output format, and stores log lines in a ring buffer.
 */

import type { ChildProcess } from 'node:child_process'
import { spawn as nodeSpawn } from 'node:child_process'
import { createInterface as nodeCreateInterface } from 'node:readline'
import {
  appendLogLine,
  createLogBuffer,
  createLogLine,
  type LogBuffer,
} from './log-buffer'

export interface OutputCaptureDependencies {
  spawn: typeof nodeSpawn
  createInterface: typeof nodeCreateInterface
}

export const defaultOutputCaptureDependencies: OutputCaptureDependencies = {
  spawn: nodeSpawn,
  createInterface: nodeCreateInterface,
}

/**
 * Result of an output-captured subprocess invocation.
 */
export interface CapturedInvocationResult {
  success: boolean
  exitCode: number | null
  signal: string | null
  error?: string
}

/**
 * Callback for handling parsed JSON events from Claude output.
 */
export type ClaudeEventCallback = (event: Record<string, unknown>) => void

/**
 * Parse a line of Claude's JSON stream output.
 * Returns null if the line is not valid JSON.
 */
export function parseClaudeJsonLine(
  line: string
): Record<string, unknown> | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Get a human-readable summary of a Claude event for logging.
 */
export function summarizeClaudeEvent(event: Record<string, unknown>): string {
  const type = event.type as string | undefined

  switch (type) {
    case 'text_delta': {
      const text = event.text as string | undefined
      if (text) {
        // Truncate long text
        const display = text.length > 80 ? `${text.slice(0, 77)}...` : text
        return `[text] ${display}`
      }
      return '[text_delta]'
    }
    case 'tool_use': {
      const name = event.name as string | undefined
      return `[tool] ${name || 'unknown'}`
    }
    case 'tool_result': {
      return '[tool_result]'
    }
    case 'assistant_message': {
      return '[assistant_message]'
    }
    case 'result': {
      const subtype = event.subtype as string | undefined
      return `[result] ${subtype || 'unknown'}`
    }
    default:
      return `[${type || 'unknown'}]`
  }
}

export interface InvokeDustOptions {
  repoPath: string
  dustCommand: string
  logBuffer: LogBuffer
  onEvent?: ClaudeEventCallback
  dependencies?: OutputCaptureDependencies
}

/**
 * Invoke dust with output capture.
 *
 * Spawns dust with `loop claude --max-iterations 1` and captures all output.
 * Stdout is parsed as Claude's JSON stream format when possible.
 * Both stdout and stderr are stored in the log buffer.
 */
export async function invokeDustWithCapture(
  options: InvokeDustOptions
): Promise<CapturedInvocationResult> {
  const {
    repoPath,
    dustCommand,
    logBuffer,
    onEvent,
    dependencies = defaultOutputCaptureDependencies,
  } = options

  const commandParts = dustCommand.split(' ')
  const command = commandParts[0]
  const spawnArguments = [
    ...commandParts.slice(1),
    'loop',
    'claude',
    '--max-iterations',
    '1',
  ]

  return new Promise(resolve => {
    let proc: ChildProcess

    try {
      proc = dependencies.spawn(command, spawnArguments, {
        cwd: repoPath,
        env: {
          ...process.env,
          DUST_UNATTENDED: '1',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      appendLogLine(
        logBuffer,
        createLogLine(`spawn error: ${message}`, 'stderr')
      )
      resolve({
        success: false,
        exitCode: null,
        signal: null,
        error: message,
      })
      return
    }

    /* v8 ignore start - defensive checks, stdout/stderr always available with pipe stdio */
    // Handle stdout - parse JSON events
    if (proc.stdout) {
      const stdoutRl = dependencies.createInterface({ input: proc.stdout })

      stdoutRl.on('line', (line: string) => {
        const event = parseClaudeJsonLine(line)

        if (event) {
          // Store a summarized version for the log buffer
          const summary = summarizeClaudeEvent(event)
          appendLogLine(logBuffer, createLogLine(summary, 'stdout'))
          onEvent?.(event)
        } else if (line.trim()) {
          // Non-JSON output, store as-is
          appendLogLine(logBuffer, createLogLine(line, 'stdout'))
        }
      })
    }

    // Handle stderr - store as-is
    if (proc.stderr) {
      const stderrRl = dependencies.createInterface({ input: proc.stderr })

      stderrRl.on('line', (line: string) => {
        if (line.trim()) {
          appendLogLine(logBuffer, createLogLine(line, 'stderr'))
        }
      })
    }
    /* v8 ignore stop */

    proc.on('close', (code, signal) => {
      resolve({
        success: code === 0,
        exitCode: code,
        signal: signal,
      })
    })

    proc.on('error', error => {
      appendLogLine(
        logBuffer,
        createLogLine(`process error: ${error.message}`, 'stderr')
      )
      resolve({
        success: false,
        exitCode: null,
        signal: null,
        error: error.message,
      })
    })
  })
}

/**
 * Repository log buffers - maps repository name to log buffer.
 */
export interface RepositoryLogBuffers {
  buffers: Map<string, LogBuffer>
}

/**
 * Create a new repository log buffers collection.
 */
export function createRepositoryLogBuffers(): RepositoryLogBuffers {
  return { buffers: new Map() }
}

/**
 * Get or create a log buffer for a repository.
 */
export function getOrCreateLogBuffer(
  collection: RepositoryLogBuffers,
  repoName: string
): LogBuffer {
  let buffer = collection.buffers.get(repoName)
  if (!buffer) {
    buffer = createLogBuffer()
    collection.buffers.set(repoName, buffer)
  }
  return buffer
}

/**
 * Remove a repository's log buffer.
 */
export function removeLogBuffer(
  collection: RepositoryLogBuffers,
  repoName: string
): void {
  collection.buffers.delete(repoName)
}

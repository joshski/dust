/**
 * Shared test utilities for CLI command tests
 *
 * These are emulators (not mocks) - they provide in-memory implementations
 * that allow testing observable behavior without verifying call order or arguments.
 * See .dust/principles/stubs-over-mocks.md for the rationale.
 */

import type { ChildProcess } from 'node:child_process'
import type { AgentSessionEvent } from '../agent-events'
import type {
  CommandContext,
  CommandDependencies,
  DustSettings,
} from '../cli/types'
import type { CommandEvent } from '../command-events'
import { createFileSystemEmulator } from '../filesystem/emulator'

export {
  createFileSystemEmulator,
  type FileSystemEmulator,
  type FileSystemTree,
} from '../filesystem/emulator'

import {
  validateImperativeOpeningSentence,
  validateOpeningSentence,
  validateOpeningSentenceLength,
  validateTaskHeadings,
} from '../lint/validators/content-validator'
import {
  validateFilename,
  validateTitleFilenameMatch,
} from '../lint/validators/filename-validator'
import { validateSemanticLinks } from '../lint/validators/link-validator'
import type { Violation } from '../lint/validators/types'

/**
 * Default environment context values for tests
 */
const testEnvironmentContext = {
  machineName: 'test-machine',
  cwd: '/test/cwd',
  platform: 'test-os 1.0.0',
  dustVersion: '0.0.0-test',
  runtimeVersion: 'v0.0.0-test',
} as const

/**
 * Creates a test agent-session-started event with required environment fields.
 * Merges provided fields with default test environment context.
 */
export function createTestAgentSessionStartedEvent(
  overrides: Partial<
    Omit<Extract<AgentSessionEvent, { type: 'agent-session-started' }>, 'type'>
  > = {}
): Extract<AgentSessionEvent, { type: 'agent-session-started' }> {
  return {
    type: 'agent-session-started',
    title: 'Test',
    prompt: 'Test prompt',
    agentType: 'claude',
    purpose: 'task',
    ...testEnvironmentContext,
    ...overrides,
  }
}

/**
 * Recursive type for defining file system structure.
 * String values represent file contents.
 * Object values represent directories.
 * Empty objects represent empty directories.
 */

/**
 * Cross-runtime environment variable stubbing.
 * Works with both Vitest and Bun test runners.
 */
const originalEnvValues = new Map<string, string | undefined>()

/**
 * Stub an environment variable with a temporary value.
 * Call restoreEnv() to restore original values.
 *
 * When a callback is provided, the env var is scoped to that callback and
 * restored automatically (works with sync and async callbacks).
 */
export function stubEnv(name: string, value: string | undefined): void
export function stubEnv<T>(
  name: string,
  value: string | undefined,
  callback: () => T | Promise<T>
): T | Promise<T>
export function stubEnv<T>(
  name: string,
  value: string | undefined,
  callback?: () => T | Promise<T>
): undefined | T | Promise<T> {
  const setEnvValue = (nextValue: string | undefined): void => {
    if (nextValue === undefined) {
      delete process.env[name]
    } else {
      process.env[name] = nextValue
    }
  }

  if (callback) {
    const originalValue = process.env[name]
    setEnvValue(value)
    try {
      const result = callback()
      if (
        result !== null &&
        result !== undefined &&
        typeof (result as PromiseLike<T>).then === 'function'
      ) {
        return Promise.resolve(result).finally(() => setEnvValue(originalValue))
      }
      setEnvValue(originalValue)
      return result
    } catch (error) {
      setEnvValue(originalValue)
      throw error
    }
  }

  if (!originalEnvValues.has(name)) {
    originalEnvValues.set(name, process.env[name])
  }
  setEnvValue(value)
}

/**
 * Restore all stubbed environment variables to their original values.
 */
export function restoreEnv(): void {
  for (const [name, originalValue] of originalEnvValues) {
    if (originalValue === undefined) {
      delete process.env[name]
    } else {
      process.env[name] = originalValue
    }
  }
  originalEnvValues.clear()
}

/**
 * Typed process.stdout.isTTY seam for tests.
 * Uses defineProperty to avoid unsafe casts when toggling TTY state.
 */
export function stubStdoutIsTTY(value: boolean | undefined): void {
  Object.defineProperty(process.stdout, 'isTTY', {
    value,
    configurable: true,
  })
}

/**
 * Typed test seam for ChildProcess instances.
 */
export function asChildProcessStub(stub: unknown): ChildProcess {
  return stub as ChildProcess
}

/**
 * Typed test seam for setInterval replacement.
 */
export function asSetIntervalStub(stub: unknown): typeof setInterval {
  return stub as typeof setInterval
}

/**
 * Typed test seam for clearInterval replacement.
 */
export function asClearIntervalStub(stub: unknown): typeof clearInterval {
  return stub as typeof clearInterval
}

/**
 * Generic typed seam for test-only interop boundaries.
 */
export function asTestType<T>(value: unknown): T {
  return value as T
}

type FetchStub = (...arguments_: Parameters<typeof fetch>) => Promise<Response>

/**
 * Creates a typed fetch stub for dependency injection in tests.
 * Keeps tests aligned with fetch's call signature without double-casts.
 */
export function createFetchStub(handler: FetchStub): typeof fetch {
  return Object.assign(
    (...arguments_: Parameters<typeof fetch>) => handler(...arguments_),
    { preconnect: fetch.preconnect }
  )
}

/**
 * Extended context with captured output lines for assertions
 */
interface ContextEmulator extends CommandContext {
  stdoutLines: string[]
  stderrLines: string[]
  emittedEvents: CommandEvent[]
}

/**
 * Creates a context emulator that captures stdout/stderr output and emitted events
 */
export function createContextEmulator(cwd = '/project'): ContextEmulator {
  const stdoutLines: string[] = []
  const stderrLines: string[] = []
  const emittedEvents: CommandEvent[] = []
  let stdoutInlineBuffer = ''
  return {
    cwd,
    stdout: (msg: string) => {
      if (stdoutInlineBuffer.length > 0) {
        stdoutLines.push(stdoutInlineBuffer)
        stdoutInlineBuffer = ''
      }
      stdoutLines.push(msg)
    },
    stdoutInline: (msg: string) => {
      stdoutInlineBuffer += msg
    },
    stderr: (msg: string) => stderrLines.push(msg),
    emitEvent: (event: CommandEvent) => emittedEvents.push(event),
    stdoutLines,
    stderrLines,
    emittedEvents,
  }
}

/**
 * Default settings for command tests
 */
const defaultTestSettings: DustSettings = { dustCommand: 'dust' }

/**
 * Lints a task file by running all validators and collecting violations.
 */
export function lintTaskFile(filePath: string, content: string): Violation[] {
  const violations: Violation[] = []
  const v1 = validateFilename(filePath)
  if (v1) violations.push(v1)
  const v2 = validateTitleFilenameMatch(filePath, content)
  if (v2) violations.push(v2)
  const v3 = validateOpeningSentence(filePath, content)
  if (v3) violations.push(v3)
  const v4 = validateOpeningSentenceLength(filePath, content)
  if (v4) violations.push(v4)
  const v5 = validateImperativeOpeningSentence(filePath, content)
  if (v5) violations.push(v5)
  violations.push(...validateTaskHeadings(filePath, content))
  violations.push(...validateSemanticLinks(filePath, content))
  return violations
}

/**
 * Strips ANSI escape codes from a string for cleaner test assertions.
 * Useful when testing output that may contain colors or formatting.
 */
export function stripAnsi(text: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI codes require escape sequences
  return text.replace(/\x1b\[[0-9;]*m/g, '')
}

/**
 * Creates command dependencies for testing, with captured output for assertions.
 *
 * @param settings - Optional DustSettings override
 * @returns Object with context (for assertions) and dependencies (for command invocation)
 */
export function createCommandDependencies(
  settings: DustSettings = defaultTestSettings
): {
  context: ContextEmulator
  dependencies: CommandDependencies
} {
  const context = createContextEmulator()
  const fileSystem = createFileSystemEmulator()
  return {
    context,
    dependencies: {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      settings,
    },
  }
}

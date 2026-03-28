/**
 * Shared test utilities for CLI command tests
 *
 * These are emulators (not mocks) - they provide in-memory implementations
 * that allow testing observable behavior without verifying call order or arguments.
 * See .dust/principles/stubs-over-mocks.md for the rationale.
 */

import { EventEmitter } from 'node:events'
import type { ChildProcess } from 'node:child_process'
import type { AgentSessionEvent } from '../agent-events'
import type {
  CommandContext,
  CommandDependencies,
  DustSettings,
} from '../cli/types'
import type { CommandEvent } from '../command-events'
import type {
  AuthConfig,
  BucketConfig,
  RuntimeConfig,
  SessionConfig,
} from '../env-config'
import { createFileSystemEmulator } from '../filesystem/emulator'

export {
  createFileSystemEmulator,
  type FileSystemEmulator,
  type FileSystemTree,
} from '../filesystem/emulator'

/**
 * Creates a test SessionConfig with default undefined values.
 * Use this for tests that need to pass session config as a dependency.
 */
export function createTestSessionConfig(
  overrides: Partial<SessionConfig> = {}
): SessionConfig {
  return {
    proxyPort: undefined,
    unattended: undefined,
    skipAgent: undefined,
    repositoryId: undefined,
    reposDir: undefined,
    ...overrides,
  }
}

/**
 * Creates a test RuntimeConfig with default undefined values.
 * Use this for tests that need to pass runtime config as a dependency.
 */
export function createTestRuntimeConfig(
  overrides: Partial<RuntimeConfig> = {}
): RuntimeConfig {
  return {
    bunInstall: undefined,
    eventsUrl: undefined,
    ...overrides,
  }
}

/**
 * Creates a test AuthConfig with default undefined values.
 * Use this for tests that need to pass auth config as a dependency.
 */
export function createTestAuthConfig(
  overrides: Partial<AuthConfig> = {}
): AuthConfig {
  return {
    claudeCodeOauthToken: undefined,
    openaiApiKey: undefined,
    ...overrides,
  }
}

/**
 * Creates a test BucketConfig with default undefined values.
 * Use this for tests that need to pass bucket config as a dependency.
 */
export function createTestBucketConfig(
  overrides: Partial<BucketConfig> = {}
): BucketConfig {
  return {
    host: undefined,
    token: undefined,
    agentConnectUrl: undefined,
    ...overrides,
  }
}

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
import { parseArtifact } from '../artifacts/parsed-artifact'

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
    stderr: stderrLines.push.bind(stderrLines),
    emitEvent: emittedEvents.push.bind(emittedEvents),
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
  const artifact = parseArtifact(filePath, content)
  const violations: Violation[] = []
  const v1 = validateFilename(filePath)
  if (v1) violations.push(v1)
  const v2 = validateTitleFilenameMatch(artifact)
  if (v2) violations.push(v2)
  const v3 = validateOpeningSentence(artifact)
  if (v3) violations.push(v3)
  const v4 = validateOpeningSentenceLength(artifact)
  if (v4) violations.push(v4)
  const v5 = validateImperativeOpeningSentence(artifact)
  if (v5) violations.push(v5)
  violations.push(...validateTaskHeadings(artifact))
  violations.push(...validateSemanticLinks(artifact))
  return violations
}

/**
 * Strips ANSI escape codes from a string for cleaner test assertions.
 * Useful when testing output that may contain colors or formatting.
 */
export function stripAnsi(text: string): string {
  // oxlint-disable-next-line no-control-regex -- ANSI codes require matching escape character
  return text.replace(/\u001b\[[0-9;]*m/g, '')
}

/**
 * Cross-runtime waitFor utility.
 * Polls a condition function until it succeeds (doesn't throw) or timeout expires.
 * Works with both Vitest and Bun test runners.
 *
 * @param condition - A function that throws if the condition isn't met
 * @param options - Optional timeout and interval settings
 */
export async function waitFor(
  condition: () => void | Promise<void>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const timeout = options.timeout ?? 1000
  const interval = options.interval ?? 50
  const startTime = Date.now()

  while (true) {
    try {
      await condition()
      return
    } catch (error) {
      if (Date.now() - startTime >= timeout) {
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, interval))
    }
  }
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
      runtime: createTestRuntimeConfig(),
    },
  }
}

/**
 * Real sleep implementation for integration tests that need actual timing.
 * Use this to avoid the no-fixed-sleep-in-tests lint rule while still
 * getting real time-based behavior in system/integration tests.
 */
export function realSleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Configuration for spawn emulator behavior
 */
export interface SpawnEmulatorConfig {
  /**
   * Default exit code for processes (default: 0)
   */
  defaultExitCode?: number
  /**
   * Auto-resolve mode: automatically emit close event on next tick (default: false)
   * When true, processes automatically resolve without manual control
   */
  autoResolve?: boolean
  /**
   * Command-specific configurations
   * Key can be a command name or pattern (e.g., "git", "docker build")
   */
  commands?: Record<
    string,
    {
      exitCode?: number
      stdout?: string
      stderr?: string
      error?: Error
    }
  >
}

/**
 * A spawned process stub with manual control over its lifecycle
 */
export interface SpawnedProcessStub {
  /**
   * The ChildProcess stub instance
   */
  process: ChildProcess
  /**
   * Manually emit stdout data
   */
  emitStdout: (data: string) => void
  /**
   * Manually emit stderr data
   */
  emitStderr: (data: string) => void
  /**
   * Manually emit close event with exit code
   */
  emitClose: (code: number) => void
  /**
   * Manually emit error event
   */
  emitError: (error: Error) => void
}

/**
 * Result from createSpawnEmulator
 */
export interface SpawnEmulator {
  /**
   * Spawn function compatible with child_process.spawn signature
   */
  spawn: (command: string, spawnArguments?: string[]) => ChildProcess
  /**
   * Get all spawned processes for assertions
   */
  getSpawnedProcesses: () => Array<{
    command: string
    arguments: string[]
    stub: SpawnedProcessStub
  }>
  /**
   * Get the most recently spawned process
   */
  getLastProcess: () => SpawnedProcessStub | undefined
}

/**
 * Creates a configurable spawn emulator for testing child process execution.
 * Returns a spawn-compatible function and utilities for tracking and controlling processes.
 *
 * @example
 * // Manual control mode (for timing-sensitive tests)
 * const { spawn, getLastProcess } = createSpawnEmulator()
 * const proc = spawn('git', ['pull'])
 * const stub = getLastProcess()!
 * stub.emitStderr('fatal: merge conflict')
 * stub.emitClose(1)
 *
 * @example
 * // Auto-resolve mode (for integration tests)
 * const { spawn } = createSpawnEmulator({
 *   autoResolve: true,
 *   commands: {
 *     git: { exitCode: 0 },
 *     'docker build': { exitCode: 1, stderr: 'Build failed' }
 *   }
 * })
 *
 * @example
 * // Command pattern matching
 * const { spawn } = createSpawnEmulator({
 *   commands: {
 *     'git pull': { exitCode: 1, stderr: 'merge conflict' }
 *   }
 * })
 */
export function createSpawnEmulator(
  config: SpawnEmulatorConfig = {}
): SpawnEmulator {
  const { defaultExitCode = 0, autoResolve = false, commands = {} } = config

  const spawnedProcesses: Array<{
    command: string
    arguments: string[]
    stub: SpawnedProcessStub
  }> = []

  function spawn(command: string, spawnArguments: string[] = []): ChildProcess {
    // Create EventEmitter-based ChildProcess stub
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter | null
      stderr: EventEmitter
    }
    proc.stdout = new EventEmitter()
    proc.stderr = new EventEmitter()

    // Helper functions for manual control
    const emitStdout = (data: string) => {
      proc.stdout?.emit('data', Buffer.from(data))
    }

    const emitStderr = (data: string) => {
      proc.stderr.emit('data', Buffer.from(data))
    }

    const emitClose = (code: number) => {
      proc.emit('close', code)
    }

    const emitError = (error: Error) => {
      proc.emit('error', error)
    }

    const stub: SpawnedProcessStub = {
      process: asChildProcessStub(proc),
      emitStdout,
      emitStderr,
      emitClose,
      emitError,
    }

    // Track the spawned process
    spawnedProcesses.push({ command, arguments: spawnArguments, stub })

    // Auto-resolve if configured
    if (autoResolve) {
      const fullCommand =
        spawnArguments.length > 0 ? `${command} ${spawnArguments[0]}` : command
      const commandConfig = commands[fullCommand] ?? commands[command] ?? {}

      setTimeout(() => {
        if (commandConfig.stdout) {
          emitStdout(commandConfig.stdout)
        }
        if (commandConfig.stderr) {
          emitStderr(commandConfig.stderr)
        }
        if (commandConfig.error) {
          emitError(commandConfig.error)
        } else {
          const exitCode = commandConfig.exitCode ?? defaultExitCode
          emitClose(exitCode)
        }
      }, 0)
    }

    return asChildProcessStub(proc)
  }

  return {
    spawn,
    getSpawnedProcesses: () => spawnedProcesses,
    getLastProcess: () =>
      spawnedProcesses.length > 0
        ? spawnedProcesses[spawnedProcesses.length - 1].stub
        : undefined,
  }
}

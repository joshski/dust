/**
 * Shared test utilities for CLI command tests
 *
 * These are emulators (not mocks) - they provide in-memory implementations
 * that allow testing observable behavior without verifying call order or arguments.
 * See .dust/principles/stubs-over-mocks.md for the rationale.
 */

import type { AgentSessionEvent } from '../agent-events'
import type {
  CommandContext,
  CommandDependencies,
  DustSettings,
} from '../cli/types'
import type { FileSystem, GlobScanner, WriteOptions } from '../filesystem/types'
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
export const testEnvironmentContext = {
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
export type FileSystemTree = {
  [name: string]: string | FileSystemTree
}

/**
 * Converts a nested FileSystemTree to absolute paths.
 * Returns both a files Map (for files) and a paths Set (for all paths including directories).
 */
function flattenFileSystemTree(
  tree: FileSystemTree,
  basePath = ''
): { files: Map<string, string>; paths: Set<string> } {
  const files = new Map<string, string>()
  const paths = new Set<string>()

  for (const [name, value] of Object.entries(tree)) {
    const fullPath = basePath ? `${basePath}/${name}` : `/${name}`

    if (typeof value === 'string') {
      // It's a file
      files.set(fullPath, value)
      paths.add(fullPath)
    } else {
      // It's a directory
      paths.add(fullPath)
      const nested = flattenFileSystemTree(value, fullPath)
      for (const [path, content] of nested.files) {
        files.set(path, content)
      }
      for (const path of nested.paths) {
        paths.add(path)
      }
    }
  }

  // Add parent directories
  for (const path of [...files.keys(), ...paths]) {
    let dir = path
    while (dir.includes('/')) {
      dir = dir.substring(0, dir.lastIndexOf('/'))
      if (dir) paths.add(dir)
    }
  }

  return { files, paths }
}

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
 * Extended context with captured output lines for assertions
 */
export interface ContextEmulator extends CommandContext {
  stdoutLines: string[]
  stderrLines: string[]
}

/**
 * Creates a context emulator that captures stdout/stderr output
 */
export function createContextEmulator(cwd = '/project'): ContextEmulator {
  const stdoutLines: string[] = []
  const stderrLines: string[] = []
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
    stdoutLines,
    stderrLines,
  }
}

/**
 * Extended file system with write tracking for assertions.
 * Also implements GlobScanner by scanning over known files.
 */
export interface FileSystemEmulator extends FileSystem, GlobScanner {
  createdDirs: string[]
  writtenFiles: Map<string, string>
  /** Internal files map - exposed for tests that need to modify file system state */
  files: Map<string, string>
  /** File permissions set via chmod - maps path to mode */
  permissions: Map<string, number>
}

/**
 * Options for createFileSystemEmulator - accepts a nested object literal
 * that mirrors the file system hierarchy.
 *
 * @example
 * createFileSystemEmulator({
 *   project: {
 *     '.dust': {
 *       principles: { 'my-principle.md': '# My Principle' },
 *       ideas: {}  // empty directory
 *     }
 *   }
 * })
 */
export type FileSystemEmulatorOptions = FileSystemTree

/**
 * Creates a file system emulator with optional file contents and write tracking.
 * Implements both FileSystem and GlobScanner interfaces - the scan() method
 * iterates over the files the emulator knows about.
 *
 * @param tree - Nested object representing file system hierarchy
 * @returns FileSystemEmulator with tracking for created directories and written files
 */
export function createFileSystemEmulator(
  tree: FileSystemEmulatorOptions = {}
): FileSystemEmulator {
  const { files, paths } = flattenFileSystemTree(tree)

  const createdDirs: string[] = []
  const writtenFiles = new Map<string, string>()
  const permissions = new Map<string, number>()
  const creationTimes = new Map<string, number>()
  let nextCreationTime = 1000

  // Assign creation times in insertion order (Map iteration order)
  for (const path of files.keys()) {
    creationTimes.set(path, nextCreationTime++)
  }

  return {
    exists: (path: string) => paths.has(path),
    isDirectory: (path: string) => paths.has(path) && !files.has(path),
    readFile: async (path: string) => {
      if (!files.has(path)) {
        const error = new Error(
          `ENOENT: no such file or directory, open '${path}'`
        )
        ;(error as NodeJS.ErrnoException).code = 'ENOENT'
        throw error
      }
      return files.get(path) as string
    },
    writeFile: async (
      path: string,
      content: string,
      options?: WriteOptions
    ) => {
      if (options?.flag === 'wx' && paths.has(path)) {
        const error = new Error(`EEXIST: file already exists, open '${path}'`)
        ;(error as NodeJS.ErrnoException).code = 'EEXIST'
        throw error
      }
      writtenFiles.set(path, content)
      paths.add(path)
      files.set(path, content)
      if (!creationTimes.has(path)) {
        creationTimes.set(path, nextCreationTime++)
      }
    },
    mkdir: async (path: string) => {
      createdDirs.push(path)
    },
    readdir: async (path: string) => {
      const prefix = `${path}/`
      const entries = new Set<string>()
      // Add direct file children
      for (const f of files.keys()) {
        if (f.startsWith(prefix)) {
          const relativePath = f.slice(prefix.length)
          // If it doesn't contain '/', it's a direct child file
          if (!relativePath.includes('/')) {
            entries.add(relativePath)
          } else {
            // Otherwise, the first segment is a directory
            entries.add(relativePath.split('/')[0])
          }
        }
      }
      return Array.from(entries)
    },
    chmod: async (path: string, mode: number) => {
      permissions.set(path, mode)
    },
    getFileCreationTime: (path: string) => {
      return creationTimes.get(path) ?? 0
    },
    scan: async function* (dir: string) {
      // Check if directory exists (it's in paths if it was created or is a parent of any file)
      if (!paths.has(dir)) {
        const error = new Error(
          `ENOENT: no such file or directory, scandir '${dir}'`
        )
        ;(error as NodeJS.ErrnoException).code = 'ENOENT'
        throw error
      }
      const prefix = `${dir}/`
      for (const file of files.keys()) {
        if (file.startsWith(prefix)) {
          yield file.slice(prefix.length)
        }
      }
    },
    rename: async (oldPath: string, newPath: string) => {
      // Move all files under oldPath to newPath
      const entriesToMove: [string, string][] = []
      const pathsToUpdate: string[] = []

      for (const [path, content] of files.entries()) {
        if (path === oldPath || path.startsWith(`${oldPath}/`)) {
          const relativePath = path.slice(oldPath.length)
          const newFilePath = `${newPath}${relativePath}`
          entriesToMove.push([path, newFilePath])
          files.set(newFilePath, content)
          paths.add(newFilePath)
        }
      }

      for (const path of paths) {
        if (path === oldPath || path.startsWith(`${oldPath}/`)) {
          pathsToUpdate.push(path)
          const relativePath = path.slice(oldPath.length)
          paths.add(`${newPath}${relativePath}`)
        }
      }

      // Remove old entries
      for (const [oldFilePath] of entriesToMove) {
        files.delete(oldFilePath)
        paths.delete(oldFilePath)
      }
      for (const oldPathEntry of pathsToUpdate) {
        paths.delete(oldPathEntry)
      }
    },
    createdDirs,
    writtenFiles,
    files,
    permissions,
  }
}

/**
 * Default settings for command tests
 */
export const defaultTestSettings: DustSettings = { dustCommand: 'dust' }

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

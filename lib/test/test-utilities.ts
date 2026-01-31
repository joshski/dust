/**
 * Shared test utilities for CLI command tests
 *
 * These are emulators (not mocks) - they provide in-memory implementations
 * that allow testing observable behavior without verifying call order or arguments.
 * See .dust/goals/stubs-over-mocks.md for the rationale.
 */

import type {
  CommandContext,
  CommandDependencies,
  DustSettings,
  FileSystem,
  GlobScanner,
} from '../cli/types'

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
 */
export function stubEnv(name: string, value: string): void {
  if (!originalEnvValues.has(name)) {
    originalEnvValues.set(name, process.env[name])
  }
  process.env[name] = value
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
  return {
    cwd,
    stdout: (msg: string) => stdoutLines.push(msg),
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
 *       goals: { 'my-goal.md': '# My Goal' },
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

  return {
    exists: (path: string) => paths.has(path),
    readFile: async (path: string) => files.get(path) ?? '',
    writeFile: async (path: string, content: string) => {
      writtenFiles.set(path, content)
    },
    mkdir: async (path: string) => {
      createdDirs.push(path)
    },
    readdir: async (path: string) => {
      const prefix = `${path}/`
      return Array.from(files.keys())
        .filter(f => f.startsWith(prefix))
        .map(f => f.slice(prefix.length))
        .filter(f => !f.includes('/'))
    },
    chmod: async (path: string, mode: number) => {
      permissions.set(path, mode)
    },
    scan: async function* (dir: string) {
      const prefix = `${dir}/`
      for (const file of files.keys()) {
        if (file.startsWith(prefix)) {
          yield file.slice(prefix.length)
        }
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

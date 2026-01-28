/**
 * Shared test utilities for CLI command tests
 */

import type { CommandContext, FileSystem, GlobScanner } from './types'

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
export interface MockContext extends CommandContext {
  stdoutLines: string[]
  stderrLines: string[]
}

/**
 * Creates a mock CommandContext that captures stdout/stderr output
 */
export function createMockContext(cwd = '/project'): MockContext {
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
 * Extended file system with write tracking for assertions
 */
export interface MockFileSystem extends FileSystem {
  createdDirs: string[]
  writtenFiles: Map<string, string>
}

/**
 * Options for createMockFileSystem
 */
export interface MockFileSystemOptions {
  /**
   * Map of file paths to their contents.
   * Parent directories are automatically inferred as existing.
   */
  files?: Map<string, string>
  /**
   * Set of additional paths that exist (directories without files)
   */
  existingPaths?: Set<string>
}

/**
 * Creates a mock FileSystem with optional file contents and write tracking.
 *
 * @param options - Configuration options
 * @returns MockFileSystem with tracking for created directories and written files
 */
export function createMockFileSystem(
  options: MockFileSystemOptions = {}
): MockFileSystem {
  const { files = new Map(), existingPaths = new Set() } = options

  // Build the set of all existing paths (files + their parent directories)
  const paths = new Set<string>(files.keys())
  for (const path of existingPaths) {
    paths.add(path)
  }
  // Add parent directories of all files
  for (const path of files.keys()) {
    let dir = path
    while (dir.includes('/')) {
      dir = dir.substring(0, dir.lastIndexOf('/'))
      if (dir) paths.add(dir)
    }
  }

  const createdDirs: string[] = []
  const writtenFiles = new Map<string, string>()

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
    createdDirs,
    writtenFiles,
  }
}

/**
 * Creates a mock GlobScanner that yields the provided files.
 *
 * @param files - Array of file paths to yield. Files matching the scan directory
 *                prefix are yielded as relative paths.
 */
export function createMockGlobScanner(files: string[] = []): GlobScanner {
  return {
    scan: async function* (dir: string) {
      const prefix = `${dir}/`
      for (const file of files) {
        if (file.startsWith(prefix)) {
          yield file.slice(prefix.length)
        }
      }
    },
  }
}

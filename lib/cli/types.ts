/**
 * Common types for CLI commands
 */

export interface CommandContext {
  cwd: string
  stdout: (message: string) => void
  stderr: (message: string) => void
}

export interface CommandResult {
  exitCode: number
}

export interface WriteOptions {
  flag?: 'w' | 'wx' // 'w' = overwrite (default), 'wx' = exclusive create (fail if exists)
}

export interface FileSystem {
  exists: (path: string) => boolean
  readFile: (path: string) => Promise<string>
  writeFile: (
    path: string,
    content: string,
    options?: WriteOptions
  ) => Promise<void>
  mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>
  readdir: (path: string) => Promise<string[]>
  chmod: (path: string, mode: number) => Promise<void>
}

export interface GlobScanner {
  scan: (dir: string) => AsyncIterable<string>
}

export interface CheckConfig {
  name: string
  command: string
  hints?: string[]
}

export interface DustSettings {
  dustCommand: string
  checks?: CheckConfig[]
  eventsUrl?: string
}

/**
 * Dependencies passed to all CLI commands
 */
export interface CommandDependencies {
  arguments: string[]
  context: CommandContext
  fileSystem: FileSystem
  globScanner: GlobScanner
  settings: DustSettings
}

/**
 * Type guard for Node.js filesystem errors.
 * Replaces scattered `(error as NodeJS.ErrnoException).code` casts.
 */
export function isNodeError(
  error: unknown,
  code: string
): error is NodeJS.ErrnoException {
  return (
    error instanceof Error && (error as NodeJS.ErrnoException).code === code
  )
}

/**
 * Creates a Node.js-style error with an errno code.
 * Useful in test emulators that simulate filesystem errors.
 */
export function createNodeError(
  message: string,
  code: string
): NodeJS.ErrnoException {
  const error = new Error(message) as NodeJS.ErrnoException
  error.code = code
  return error
}

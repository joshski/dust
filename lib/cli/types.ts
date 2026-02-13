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
  timeoutMilliseconds?: number
}

export interface DustSettings {
  dustCommand: string
  installCommand?: string
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

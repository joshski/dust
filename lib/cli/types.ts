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

export interface FileSystem {
  exists: (path: string) => boolean
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<void>
  mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>
  readdir: (path: string) => Promise<string[]>
}

export interface GlobScanner {
  scan: (dir: string) => AsyncIterable<string>
}

export interface CheckConfig {
  name: string
  command: string
}

export interface DustSettings {
  dustCommand: string
  checks?: CheckConfig[]
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

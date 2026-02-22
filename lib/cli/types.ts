/**
 * Common types for CLI commands
 */

import type { FileSystem, GlobScanner } from '../filesystem/types'

export type {
  FileSystem,
  GlobScanner,
  ReadableFileSystem,
} from '../filesystem/types'

export interface CommandContext {
  cwd: string
  stdout: (message: string) => void
  stdoutInline?: (message: string) => void
  stderr: (message: string) => void
}

export interface CommandResult {
  exitCode: number
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
  extraDirectories?: string[]
}

export type DirectoryFileSorter = (
  dir: string,
  files: string[]
) => Promise<string[]>

/**
 * Dependencies passed to all CLI commands
 */
export interface CommandDependencies {
  arguments: string[]
  context: CommandContext
  fileSystem: FileSystem
  globScanner: GlobScanner
  settings: DustSettings
  directoryFileSorter?: DirectoryFileSorter
}

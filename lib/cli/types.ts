/**
 * Common types for CLI commands
 */

import type { CommandEvent } from '../command-events'
import type { RuntimeConfig } from '../env-config'
import type { FileSystem, GlobScanner } from '../filesystem/types'

export type {
  FileReader,
  FileSystem,
  GlobScanner,
  ReadableFileSystem,
} from '../filesystem/types'

export interface CommandContext {
  cwd: string
  stdout: (message: string) => void
  stdoutInline?: (message: string) => void
  stderr: (message: string) => void
  emitEvent?: (event: CommandEvent) => void
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
  excludeCorePrinciples?: string[]
  extraDirectories?: string[]
}

export interface FileWithTimestamp {
  file: string
  lastCommittedAt: string | null
}

export type DirectoryFileSorter = (
  dir: string,
  files: string[]
) => Promise<FileWithTimestamp[]>

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
  runtime: RuntimeConfig
}

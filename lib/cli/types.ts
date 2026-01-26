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

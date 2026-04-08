/**
 * Shared types and helpers used by both bucket-worker.ts and native-io.ts.
 *
 * Extracted to break the cyclic dependency between those two modules.
 */

import type { AuthDependencies } from './auth'
import type { WebSocketLike } from './events'
import type { ConnectionInitMessage } from './server-messages'
import type { run as claudeRun } from '../claude/run'
import type {
  AuthConfig,
  BucketConfig,
  RuntimeConfig,
  SessionConfig,
} from '../env-config'
import type { FileSystem } from '../filesystem/types'

export interface BucketDependencies {
  spawn: typeof import('node:child_process').spawn
  createWebSocket: (url: string, token: string) => WebSocketLike
  buildConnectionInit: () => Promise<ConnectionInitMessage>
  setupKeypress: (onKey: (key: string) => void) => () => void
  setupSignals: (onSignal: () => void) => () => void
  setupResize: (onResize: (width: number, height: number) => void) => () => void
  getTerminalSize: () => { width: number; height: number }
  writeStdout: (data: string) => void
  isTTY: boolean
  sleep: (ms: number) => Promise<void>
  getReposDir: () => string
  auth: AuthDependencies
  authConfig: AuthConfig
  bucket: BucketConfig
  session: SessionConfig
  runtime: RuntimeConfig
  /** Create an interval timer, returns an ID for clearing. */
  createInterval: (callback: () => void, ms: number) => unknown
  /** Clear an interval by ID. */
  clearInterval: (id: unknown) => void
  /** Optional override for the agent runner (default: claudeRun). Used for testing. */
  run?: typeof claudeRun
  /** Shell runner for pre-flight commands (install, check). Used for testing. */
  shellRunner?: import('../cli/process-runner').ShellRunner
  /** Force Docker mode for all repositories (--docker flag). */
  forceDocker?: boolean
  /** Force Apple Container mode for all repositories (--apple-container flag). */
  forceAppleContainer?: boolean
}

/**
 * Dependencies for createAuthFileSystem - allows injection of low-level fs operations
 */
export interface AuthFileSystemDependencies {
  accessSync: (path: string) => void
  statSync: (path: string) => {
    isDirectory: () => boolean
    birthtimeMs: number
  }
  readFile: (path: string, encoding: 'utf8') => Promise<string>
  writeFile: (path: string, content: string, encoding: 'utf8') => Promise<void>
  mkdir: (
    path: string,
    options?: { recursive?: boolean }
  ) => Promise<string | undefined>
  readdir: (path: string) => Promise<string[]>
  chmod: (path: string, mode: number) => Promise<void>
  rename: (oldPath: string, newPath: string) => Promise<void>
}

/**
 * Creates a FileSystem implementation for auth operations.
 * The exists, isDirectory, and getFileCreationTime methods wrap sync fs operations
 * with try/catch to convert exceptions to boolean/default values.
 */
export function createAuthFileSystem(
  dependencies: AuthFileSystemDependencies
): FileSystem {
  return {
    exists: (path: string) => {
      try {
        dependencies.accessSync(path)
        return true
      } catch {
        return false
      }
    },
    isDirectory: (path: string) => {
      try {
        return dependencies.statSync(path).isDirectory()
      } catch {
        return false
      }
    },
    getFileCreationTime: (path: string) =>
      dependencies.statSync(path).birthtimeMs,
    readFile: (path: string) => dependencies.readFile(path, 'utf8'),
    writeFile: (path: string, content: string) =>
      dependencies.writeFile(path, content, 'utf8'),
    mkdir: (path: string, options?: { recursive?: boolean }) =>
      dependencies.mkdir(path, options).then(() => {}),
    readdir: dependencies.readdir.bind(dependencies),
    chmod: dependencies.chmod.bind(dependencies),
    rename: dependencies.rename.bind(dependencies),
  }
}

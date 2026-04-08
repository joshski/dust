/**
 * Shared types for repository management.
 *
 * Extracted to break the cyclic dependency between repository.ts and repository-loop.ts.
 */

import { spawn as nodeSpawn } from 'node:child_process'
import type { run as claudeRun } from '../claude/run'
import type { FileSystem } from '../cli/types'
import type { DockerDependencies } from '../docker/docker-agent'
import type { AuthConfig, RuntimeConfig, SessionConfig } from '../env-config'
import type {
  ToolExecutionRequest,
  ToolExecutionResult,
} from './command-events-proxy'
import type { LogBuffer } from './log-buffer'
import type { RepositoryLifecycleState } from './repository-lifecycle'
import type { ToolDefinition } from './server-messages'

export interface Repository {
  name: string
  gitUrl: string
  gitSshUrl: string
  url: string
  id: number
  agentProvider?: string
  branch?: string
}

export interface RepositoryState {
  repository: Repository
  path: string
  logBuffer: LogBuffer
  lifecycle: RepositoryLifecycleState
  agentStatus: 'idle' | 'busy'
  wakeUp?: () => void
  taskAvailablePending?: boolean
}

export interface RepositoryDependencies {
  spawn: typeof nodeSpawn
  run: typeof claudeRun
  fileSystem: FileSystem
  sleep: (ms: number) => Promise<void>
  getReposDir: () => string
  session: SessionConfig
  runtime: RuntimeConfig
  auth: AuthConfig
  /** Optional overrides for Docker dependency functions (for testing) */
  dockerDeps?: Partial<DockerDependencies>
  /** Function to get current tool definitions */
  getTools?: () => ToolDefinition[]
  /** Function to get revealed tool families (for progressive disclosure) */
  getRevealedFamilies?: () => Set<string>
  /** Forward tool execution requests to the bucket server */
  forwardToolExecution?: (
    request: ToolExecutionRequest
  ) => Promise<ToolExecutionResult>
  /** Mark a tool family as revealed (for progressive disclosure) */
  revealFamily?: (familyName: string) => void
  /** Shell runner for pre-flight commands (install, check) */
  shellRunner?: import('../cli/process-runner').ShellRunner
  /** Force Docker mode using bundled default Dockerfile */
  forceDocker?: boolean
  /** Force Apple Container mode using bundled default Dockerfile */
  forceAppleContainer?: boolean
}

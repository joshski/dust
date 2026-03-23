/**
 * Container runtime abstraction for dust agent execution.
 *
 * This module defines a provider-agnostic interface for container runtimes,
 * allowing dust to support multiple container technologies (Docker, Apple
 * Container, etc.) while keeping the agent orchestration logic decoupled.
 */

import type { spawn as nodeSpawn } from 'node:child_process'
import type os from 'node:os'

/**
 * Dependencies injected into container runtime operations.
 * Keeps the runtime implementations pure by externalizing I/O.
 */
export interface ContainerDependencies {
  spawn: typeof nodeSpawn
  homedir: typeof os.homedir
  existsSync: (path: string) => boolean
}

/**
 * Configuration for building a container image.
 */
export interface BuildConfig {
  /** Path to the repository root */
  repoPath: string
  /** Tag to apply to the built image */
  imageTag: string
  /** Optional path to a custom Dockerfile */
  dockerfilePath?: string
}

/**
 * Result of a container image build operation.
 */
export type BuildResult = { success: true } | { success: false; error: string }

/**
 * Configuration for running a container.
 */
export interface RunConfig {
  imageTag: string
  repoPath: string
  homeDir: string
  gitProxyUrl?: string
  claudeApiProxyUrl?: string
  settingsFilePath?: string
}

/**
 * Abstract interface for container runtimes.
 *
 * Each runtime implementation provides the same capabilities through
 * its native CLI tools. The interface is designed for:
 * - Pure functions where possible (buildRunArgs)
 * - Dependency injection for I/O operations (isAvailable, buildImage)
 */
export interface ContainerRuntime {
  /** Unique identifier for this runtime */
  name: 'docker' | 'apple-container'

  /** Check if the runtime CLI is available on the system */
  isAvailable: (dependencies: ContainerDependencies) => Promise<boolean>

  /** Build an image from a Dockerfile */
  buildImage: (
    config: BuildConfig,
    dependencies: ContainerDependencies
  ) => Promise<BuildResult>

  /** The CLI command for running containers (e.g., 'docker', 'container') */
  runCommand: string

  /** Map dust's run options to CLI arguments */
  buildRunArgs: (config: RunConfig) => string[]
}

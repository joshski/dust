/**
 * Docker-based agent execution for dust loop.
 *
 * When a repository contains a .dust/config/container/Dockerfile, the agent
 * runs inside a Docker container instead of directly on the host. This
 * provides isolation and lets each project define its ideal agent environment.
 *
 * This module re-exports utilities from the container abstraction layer
 * and provides the high-level prepareDockerConfig orchestration function.
 */

import path from 'node:path'
import type {
  ContainerDependencies,
  ContainerRuntime,
} from '../container/runtime'
import {
  dockerRuntime,
  generateImageTag,
  getDefaultDockerfilePath,
  hasDockerfile,
} from '../container/docker-runtime'
import { createLogger } from '../logging'

const log = createLogger('dust:docker:agent')

// Re-export types and utilities for backward compatibility
export type { ContainerDependencies as DockerDependencies } from '../container/runtime'
export { generateImageTag, getDefaultDockerfilePath, hasDockerfile }

// Re-export the build functions through the runtime for compatibility
export async function isDockerAvailable(
  dependencies: ContainerDependencies
): Promise<boolean> {
  return dockerRuntime.isAvailable(dependencies)
}

export async function buildDockerImage(
  config: { repoPath: string; imageTag: string; dockerfilePath?: string },
  dependencies: ContainerDependencies
): Promise<{ success: true } | { success: false; error: string }> {
  return dockerRuntime.buildImage(config, dependencies)
}

const LEGACY_DOCKERFILE_PATH = ['.dust', 'Dockerfile']

const LEGACY_DOCKERFILE_ERROR =
  'Legacy Docker configuration path ".dust/Dockerfile" is no longer supported. Move it to ".dust/config/container/Dockerfile".'

/**
 * Check if a Dockerfile exists at the legacy .dust/Dockerfile location.
 */
export function hasLegacyDockerfile(
  repoPath: string,
  dependencies: ContainerDependencies
): boolean {
  const dockerfilePath = path.join(repoPath, ...LEGACY_DOCKERFILE_PATH)
  return dependencies.existsSync(dockerfilePath)
}

type ContainerPrepareEvent =
  | { type: 'loop.docker_detected'; imageTag: string }
  | { type: 'loop.docker_building'; imageTag: string }
  | { type: 'loop.docker_built'; imageTag: string }
  | { type: 'loop.docker_error'; error: string }

interface ContainerSpawnConfig {
  imageTag: string
  repoPath: string
  homeDir: string
}

type PrepareContainerConfigResult =
  | { config: ContainerSpawnConfig }
  | { error: string }
  | Record<string, never>

interface PrepareContainerOptions {
  forceContainer?: boolean
}

/**
 * Prepare container configuration for agent execution.
 *
 * Rejects legacy .dust/Dockerfile usage, checks for a
 * .dust/config/container/Dockerfile, verifies runtime availability, builds the
 * image, and returns the spawn configuration. Emits events throughout the
 * process.
 *
 * When `forceContainer` is true and no custom Dockerfile exists, uses the bundled
 * default Dockerfile.
 *
 * Returns:
 * - `{ config: ContainerSpawnConfig }` on success
 * - `{ error: string }` on failure (runtime not available or build failed)
 * - `{}` if no Dockerfile exists and forceContainer is false
 */
async function prepareContainerConfig(
  repoPath: string,
  dependencies: ContainerDependencies,
  onEvent: (event: ContainerPrepareEvent) => void,
  runtime: ContainerRuntime,
  options?: PrepareContainerOptions
): Promise<PrepareContainerConfigResult> {
  log(`checking for container configuration in ${repoPath}`)

  if (hasLegacyDockerfile(repoPath, dependencies)) {
    onEvent({ type: 'loop.docker_error', error: LEGACY_DOCKERFILE_ERROR })
    return { error: LEGACY_DOCKERFILE_ERROR }
  }

  const hasCustomDockerfile = hasDockerfile(repoPath, dependencies)
  const forceContainer = options?.forceContainer ?? false

  if (!hasCustomDockerfile && !forceContainer) {
    log('no .dust/config/container/Dockerfile found, running without container')
    return {}
  }

  // Use custom Dockerfile if it exists, otherwise use bundled default
  const dockerfilePath = hasCustomDockerfile
    ? undefined // buildImage will use the default path
    : getDefaultDockerfilePath()

  const imageTag = generateImageTag(repoPath)
  log(`Dockerfile found, image tag: ${imageTag}`)
  onEvent({ type: 'loop.docker_detected', imageTag })

  if (!(await runtime.isAvailable(dependencies))) {
    const error =
      runtime.name === 'apple-container'
        ? 'Apple Container CLI not found. Install from https://github.com/apple/container or use --docker.'
        : hasCustomDockerfile
          ? 'Docker not available. Install Docker or remove .dust/config/container/Dockerfile to run without Docker.'
          : 'Docker not available. Install Docker to use --docker flag.'
    return { error }
  }

  onEvent({ type: 'loop.docker_building', imageTag })
  const buildResult = await runtime.buildImage(
    { repoPath, imageTag, dockerfilePath },
    dependencies
  )

  if (!buildResult.success) {
    onEvent({ type: 'loop.docker_error', error: buildResult.error })
    return { error: buildResult.error }
  }

  onEvent({ type: 'loop.docker_built', imageTag })

  const homeDir = dependencies.homedir()
  const config: ContainerSpawnConfig = {
    imageTag,
    repoPath,
    homeDir,
  }

  log(`Container config ready: ${JSON.stringify(config)}`)
  return { config }
}

/**
 * Prepare container configuration with a specific runtime.
 *
 * When runtime is null, defaults to Docker runtime (for Dockerfile detection mode).
 */
export async function prepareContainerConfigWithRuntime(
  repoPath: string,
  dependencies: ContainerDependencies,
  onEvent: (event: ContainerPrepareEvent) => void,
  runtime: ContainerRuntime | null,
  options?: PrepareContainerOptions
): Promise<PrepareContainerConfigResult> {
  return prepareContainerConfig(
    repoPath,
    dependencies,
    onEvent,
    runtime ?? dockerRuntime,
    options
  )
}

/**
 * Prepare Docker configuration for agent execution.
 *
 * This is a thin wrapper around prepareContainerConfig that uses the Docker
 * runtime. Kept for backward compatibility with existing callers.
 */
export async function prepareDockerConfig(
  repoPath: string,
  dependencies: ContainerDependencies,
  onEvent: (event: ContainerPrepareEvent) => void,
  options?: { forceDocker?: boolean }
): Promise<PrepareContainerConfigResult> {
  return prepareContainerConfig(
    repoPath,
    dependencies,
    onEvent,
    dockerRuntime,
    {
      forceContainer: options?.forceDocker,
    }
  )
}

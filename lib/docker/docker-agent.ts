/**
 * Docker-based agent execution for dust loop.
 *
 * When a repository contains a .dust/config/container/Dockerfile, the agent
 * runs inside a Docker container instead of directly on the host. This
 * provides isolation and lets each project define its ideal agent environment.
 */

import type { spawn as nodeSpawn } from 'node:child_process'
import type os from 'node:os'
import path from 'node:path'
import { createLogger } from '../logging'

const log = createLogger('dust:docker:agent')

interface DockerConfig {
  /** Path to the repository */
  repoPath: string
  /** Docker image tag to use (e.g., 'dust-agent-myrepo') */
  imageTag: string
  /** Optional custom Dockerfile path (defaults to .dust/config/container/Dockerfile) */
  dockerfilePath?: string
}

export interface DockerDependencies {
  spawn: typeof nodeSpawn
  homedir: typeof os.homedir
  existsSync: (path: string) => boolean
}

const CANONICAL_DOCKERFILE_PATH = ['.dust', 'config', 'container', 'Dockerfile']
const LEGACY_DOCKERFILE_PATH = ['.dust', 'Dockerfile']

const LEGACY_DOCKERFILE_ERROR =
  'Legacy Docker configuration path ".dust/Dockerfile" is no longer supported. Move it to ".dust/config/container/Dockerfile".'

/**
 * Get the path to the bundled default Dockerfile.
 */
export function getDefaultDockerfilePath(): string {
  // import.meta.dirname gives us the directory of this module
  return path.join(import.meta.dirname, 'default.Dockerfile')
}

/**
 * Check if Docker is available on the system.
 */
export async function isDockerAvailable(
  dependencies: DockerDependencies
): Promise<boolean> {
  return new Promise(resolve => {
    const proc = dependencies.spawn('docker', ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    proc.on('close', code => {
      resolve(code === 0)
    })

    proc.on('error', () => {
      resolve(false)
    })
  })
}

/**
 * Generate a deterministic Docker image tag from the repository path.
 * Uses the repository directory name, sanitized for Docker tag requirements.
 */
export function generateImageTag(repoPath: string): string {
  const repoName = path.basename(repoPath)
  // Docker tags must be lowercase and can only contain [a-z0-9._-]
  const sanitized = repoName.toLowerCase().replace(/[^a-z0-9._-]/g, '-')
  return `dust-agent-${sanitized}`
}

type BuildResult = { success: true } | { success: false; error: string }

/**
 * Build a Docker image from a Dockerfile.
 * Uses the provided dockerfilePath or defaults to .dust/config/container/Dockerfile.
 */
export async function buildDockerImage(
  config: DockerConfig,
  dependencies: DockerDependencies
): Promise<BuildResult> {
  const dockerfilePath =
    config.dockerfilePath ??
    path.join(config.repoPath, '.dust', 'config', 'container', 'Dockerfile')

  log(`building Docker image ${config.imageTag} from ${dockerfilePath}`)

  return new Promise(resolve => {
    const proc = dependencies.spawn(
      'docker',
      ['build', '-t', config.imageTag, '-f', dockerfilePath, config.repoPath],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )

    let stderr = ''
    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', code => {
      if (code === 0) {
        log(`Docker image ${config.imageTag} built successfully`)
        resolve({ success: true })
      } else {
        log(`Docker build failed: ${stderr}`)
        resolve({
          success: false,
          error: `Docker build failed with exit code ${code}: ${stderr.trim()}`,
        })
      }
    })

    proc.on('error', error => {
      resolve({
        success: false,
        error: `Docker build failed: ${error.message}`,
      })
    })
  })
}

/**
 * Check if a Dockerfile exists at .dust/config/container/Dockerfile.
 */
export function hasDockerfile(
  repoPath: string,
  dependencies: DockerDependencies
): boolean {
  const dockerfilePath = path.join(repoPath, ...CANONICAL_DOCKERFILE_PATH)
  return dependencies.existsSync(dockerfilePath)
}

/**
 * Check if a Dockerfile exists at the legacy .dust/Dockerfile location.
 */
export function hasLegacyDockerfile(
  repoPath: string,
  dependencies: DockerDependencies
): boolean {
  const dockerfilePath = path.join(repoPath, ...LEGACY_DOCKERFILE_PATH)
  return dependencies.existsSync(dockerfilePath)
}

type DockerPrepareEvent =
  | { type: 'loop.docker_detected'; imageTag: string }
  | { type: 'loop.docker_building'; imageTag: string }
  | { type: 'loop.docker_built'; imageTag: string }
  | { type: 'loop.docker_error'; error: string }

interface DockerSpawnConfig {
  imageTag: string
  repoPath: string
  homeDir: string
}

type PrepareDockerConfigResult =
  | { config: DockerSpawnConfig }
  | { error: string }
  | Record<string, never>

interface PrepareDockerOptions {
  forceDocker?: boolean
}

/**
 * Prepare Docker configuration for agent execution.
 *
 * Rejects legacy .dust/Dockerfile usage, checks for a
 * .dust/config/container/Dockerfile, verifies Docker availability, builds the
 * image, and returns the spawn configuration. Emits events throughout the
 * process.
 *
 * When `forceDocker` is true and no custom Dockerfile exists, uses the bundled
 * default Dockerfile.
 *
 * Returns:
 * - `{ config: DockerSpawnConfig }` on success
 * - `{ error: string }` on failure (Docker not available or build failed)
 * - `{}` if no Dockerfile exists and forceDocker is false
 */
export async function prepareDockerConfig(
  repoPath: string,
  dependencies: DockerDependencies,
  onEvent: (event: DockerPrepareEvent) => void,
  options?: PrepareDockerOptions
): Promise<PrepareDockerConfigResult> {
  log(`checking for Docker configuration in ${repoPath}`)

  if (hasLegacyDockerfile(repoPath, dependencies)) {
    onEvent({ type: 'loop.docker_error', error: LEGACY_DOCKERFILE_ERROR })
    return { error: LEGACY_DOCKERFILE_ERROR }
  }

  const hasCustomDockerfile = hasDockerfile(repoPath, dependencies)
  const forceDocker = options?.forceDocker ?? false

  if (!hasCustomDockerfile && !forceDocker) {
    log('no .dust/config/container/Dockerfile found, running without Docker')
    return {}
  }

  // Use custom Dockerfile if it exists, otherwise use bundled default
  const dockerfilePath = hasCustomDockerfile
    ? undefined // buildDockerImage will use the default path
    : getDefaultDockerfilePath()

  const imageTag = generateImageTag(repoPath)
  log(`Dockerfile found, image tag: ${imageTag}`)
  onEvent({ type: 'loop.docker_detected', imageTag })

  if (!(await isDockerAvailable(dependencies))) {
    const error = hasCustomDockerfile
      ? 'Docker not available. Install Docker or remove .dust/config/container/Dockerfile to run without Docker.'
      : 'Docker not available. Install Docker to use --docker flag.'
    return { error }
  }

  onEvent({ type: 'loop.docker_building', imageTag })
  const buildResult = await buildDockerImage(
    { repoPath, imageTag, dockerfilePath },
    dependencies
  )

  if (!buildResult.success) {
    onEvent({ type: 'loop.docker_error', error: buildResult.error })
    return { error: buildResult.error }
  }

  onEvent({ type: 'loop.docker_built', imageTag })

  const homeDir = dependencies.homedir()
  const config: DockerSpawnConfig = {
    imageTag,
    repoPath,
    homeDir,
  }

  log(`Docker config ready: ${JSON.stringify(config)}`)
  return { config }
}

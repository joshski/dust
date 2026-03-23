/**
 * Docker implementation of the ContainerRuntime interface.
 */

import path from 'node:path'
import { createLogger } from '../logging'
import type {
  BuildConfig,
  BuildResult,
  ContainerDependencies,
  ContainerRuntime,
  RunConfig,
} from './runtime'

const log = createLogger('dust:container:docker')

const CANONICAL_DOCKERFILE_PATH = ['.dust', 'config', 'container', 'Dockerfile']

/**
 * Get the path to the bundled default Dockerfile.
 */
export function getDefaultDockerfilePath(): string {
  return path.join(import.meta.dirname, '..', 'docker', 'default.Dockerfile')
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

/**
 * Check if a Dockerfile exists at .dust/config/container/Dockerfile.
 */
export function hasDockerfile(
  repoPath: string,
  dependencies: ContainerDependencies
): boolean {
  const dockerfilePath = path.join(repoPath, ...CANONICAL_DOCKERFILE_PATH)
  return dependencies.existsSync(dockerfilePath)
}

/**
 * Check if Docker CLI is available on the system.
 */
async function isDockerAvailable(
  dependencies: ContainerDependencies
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
 * Build a Docker image from a Dockerfile.
 */
async function buildDockerImage(
  config: BuildConfig,
  dependencies: ContainerDependencies
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
 * Build Docker run arguments from a RunConfig.
 */
function buildDockerRunArgs(config: RunConfig): string[] {
  // This function maps dust's container config to docker run arguments.
  // The actual run command construction happens in the agent spawning code,
  // but this provides the runtime-specific argument mapping.
  const runArguments: string[] = [
    'run',
    '--rm',
    '-v',
    `${config.repoPath}:/workspace`,
    '-w',
    '/workspace',
  ]

  if (config.gitProxyUrl) {
    runArguments.push('-e', `GIT_PROXY_URL=${config.gitProxyUrl}`)
  }

  if (config.claudeApiProxyUrl) {
    runArguments.push('-e', `CLAUDE_API_PROXY_URL=${config.claudeApiProxyUrl}`)
  }

  if (config.settingsFilePath) {
    runArguments.push(
      '-v',
      `${config.settingsFilePath}:/tmp/claude-settings.json:ro`
    )
  }

  runArguments.push(config.imageTag)

  return runArguments
}

/**
 * Docker runtime implementation.
 */
export const dockerRuntime: ContainerRuntime = {
  name: 'docker',
  isAvailable: isDockerAvailable,
  buildImage: buildDockerImage,
  runCommand: 'docker',
  buildRunArgs: buildDockerRunArgs,
}

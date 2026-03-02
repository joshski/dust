/**
 * Docker-based agent execution for dust loop.
 *
 * When a repository contains a .dust/Dockerfile, the agent runs inside
 * a Docker container instead of directly on the host. This provides
 * isolation and lets each project define its ideal agent environment.
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
}

export interface DockerDependencies {
  spawn: typeof nodeSpawn
  homedir: typeof os.homedir
  existsSync: (path: string) => boolean
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
 * Build a Docker image from the repository's .dust/Dockerfile.
 */
export async function buildDockerImage(
  config: DockerConfig,
  dependencies: DockerDependencies
): Promise<BuildResult> {
  const dockerfilePath = path.join(config.repoPath, '.dust', 'Dockerfile')

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
 * Check if a Dockerfile exists at .dust/Dockerfile in the repository.
 */
export function hasDockerfile(
  repoPath: string,
  dependencies: DockerDependencies
): boolean {
  const dockerfilePath = path.join(repoPath, '.dust', 'Dockerfile')
  return dependencies.existsSync(dockerfilePath)
}

/**
 * Apple Container implementation of the ContainerRuntime interface.
 *
 * Apple's container project (https://github.com/apple/container) runs Linux
 * containers as lightweight VMs on Apple Silicon (macOS 26+). It uses
 * OCI-compatible images, so existing Dockerfiles work without modification.
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

const log = createLogger('dust:container:apple-container')

/**
 * Check if Apple Container CLI is available on the system.
 */
async function isAppleContainerAvailable(
  dependencies: ContainerDependencies
): Promise<boolean> {
  return new Promise(resolve => {
    const proc = dependencies.spawn('container', ['--version'], {
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
 * Build an image using Apple Container CLI.
 */
async function buildAppleContainerImage(
  config: BuildConfig,
  dependencies: ContainerDependencies
): Promise<BuildResult> {
  const dockerfilePath =
    config.dockerfilePath ??
    path.join(config.repoPath, '.dust', 'config', 'container', 'Dockerfile')

  log(
    `building Apple Container image ${config.imageTag} from ${dockerfilePath}`
  )

  return new Promise(resolve => {
    const proc = dependencies.spawn(
      'container',
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
        log(`Apple Container image ${config.imageTag} built successfully`)
        resolve({ success: true })
      } else {
        log(`Apple Container build failed: ${stderr}`)
        resolve({
          success: false,
          error: `Apple Container build failed with exit code ${code}: ${stderr.trim()}`,
        })
      }
    })

    proc.on('error', error => {
      resolve({
        success: false,
        error: `Apple Container build failed: ${error.message}`,
      })
    })
  })
}

/**
 * Build Apple Container run arguments from a RunConfig.
 */
function buildAppleContainerRunArgs(config: RunConfig): string[] {
  const runArguments: string[] = [
    'run',
    '--rm',
    '--volume',
    `${config.repoPath}:/workspace`,
    '--workdir',
    '/workspace',
  ]

  if (config.gitProxyUrl) {
    runArguments.push('--env', `GIT_PROXY_URL=${config.gitProxyUrl}`)
  }

  if (config.claudeApiProxyUrl) {
    runArguments.push(
      '--env',
      `CLAUDE_API_PROXY_URL=${config.claudeApiProxyUrl}`
    )
  }

  if (config.settingsFilePath) {
    runArguments.push(
      '--volume',
      `${config.settingsFilePath}:/tmp/claude-settings.json:ro`
    )
  }

  runArguments.push(config.imageTag)

  return runArguments
}

/**
 * Apple Container runtime implementation.
 */
export const appleContainerRuntime: ContainerRuntime = {
  name: 'apple-container',
  isAvailable: isAppleContainerAvailable,
  buildImage: buildAppleContainerImage,
  runCommand: 'container',
  hostAddress: '192.168.64.1',
  buildRunArgs: buildAppleContainerRunArgs,
}

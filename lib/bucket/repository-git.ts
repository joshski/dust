/**
 * Git operations for dust bucket repository management.
 *
 * Handles cloning, removing, and path resolution for repositories.
 */

import type { spawn as nodeSpawn } from 'node:child_process'
import { join } from 'node:path'
import type { CommandDependencies } from '../cli/types'

/**
 * Get the directory path for a repository.
 */
export function getRepoPath(repoName: string, reposDir: string): string {
  const safeName = repoName.replace(/[^a-zA-Z0-9-_/]/g, '-')
  return join(reposDir, safeName)
}

/**
 * Clone a repository using a specific URL.
 */
function cloneWithUrl(
  url: string,
  targetPath: string,
  spawn: typeof nodeSpawn,
  branch?: string
): Promise<{ success: boolean; stderr: string }> {
  return new Promise(resolve => {
    const cloneArguments = branch
      ? ['clone', '--branch', branch, url, targetPath]
      : ['clone', url, targetPath]
    const proc = spawn('git', cloneArguments, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
        GIT_SSH_COMMAND: 'ssh -o StrictHostKeyChecking=accept-new',
      },
    })

    let stderr = ''
    proc.stderr?.on('data', data => {
      stderr += data.toString()
    })

    proc.on('close', code => {
      resolve({ success: code === 0, stderr: stderr.trim() })
    })

    proc.on('error', error => {
      resolve({ success: false, stderr: error.message })
    })
  })
}

/**
 * Clone a repository to a temporary directory.
 * Tries HTTPS first, falls back to SSH if available and HTTPS fails.
 */
export async function cloneRepository(
  repository: {
    name: string
    gitUrl: string
    gitSshUrl: string
    branch?: string
  },
  targetPath: string,
  spawn: typeof nodeSpawn,
  context: CommandDependencies['context']
): Promise<boolean> {
  const httpsResult = await cloneWithUrl(
    repository.gitUrl,
    targetPath,
    spawn,
    repository.branch
  )

  if (httpsResult.success) {
    return true
  }

  // HTTPS clone failed, try SSH fallback
  context.stderr(
    `HTTPS clone failed for ${repository.name}, trying SSH: ${httpsResult.stderr}`
  )
  const sshResult = await cloneWithUrl(
    repository.gitSshUrl,
    targetPath,
    spawn,
    repository.branch
  )
  if (sshResult.success) {
    return true
  }
  context.stderr(
    `Failed to clone ${repository.name} via SSH: ${sshResult.stderr}`
  )
  return false
}

/**
 * Remove a repository directory.
 */
export async function removeRepository(
  path: string,
  spawn: typeof nodeSpawn,
  context: CommandDependencies['context']
): Promise<boolean> {
  return new Promise(resolve => {
    const proc = spawn('rm', ['-rf', path], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    proc.on('close', code => {
      resolve(code === 0)
    })

    proc.on('error', error => {
      context.stderr(`Failed to remove ${path}: ${error.message}`)
      resolve(false)
    })
  })
}

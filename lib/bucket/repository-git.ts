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
 * Clone a repository to a temporary directory.
 */
export async function cloneRepository(
  repository: { name: string; gitUrl: string },
  targetPath: string,
  spawn: typeof nodeSpawn,
  context: CommandDependencies['context']
): Promise<boolean> {
  return new Promise(resolve => {
    const proc = spawn('git', ['clone', repository.gitUrl, targetPath], {
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
      if (code === 0) {
        resolve(true)
      } else {
        context.stderr(`Failed to clone ${repository.name}: ${stderr.trim()}`)
        resolve(false)
      }
    })

    proc.on('error', error => {
      context.stderr(`Failed to clone ${repository.name}: ${error.message}`)
      resolve(false)
    })
  })
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

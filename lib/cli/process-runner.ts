/**
 * Shared process runner utilities for buffered command execution.
 *
 * Provides a unified interface for running shell commands and git commands
 * with buffered output capture.
 */

import { type ChildProcess, spawn } from 'node:child_process'

export interface ProcessResult {
  exitCode: number
  output: string
  timedOut?: boolean
}

type SpawnFn = (
  command: string,
  commandArguments: string[],
  options: { cwd: string; shell?: boolean }
) => ChildProcess

/**
 * Creates a buffered process runner for executing shell commands.
 * Commands are run with shell: true for command string interpretation.
 */
export interface ShellRunner {
  run: (
    command: string,
    cwd: string,
    timeoutMs?: number
  ) => Promise<ProcessResult>
}

export function createShellRunner(spawnFn: SpawnFn): ShellRunner {
  return {
    run: (command, cwd, timeoutMs) =>
      runBufferedProcess(spawnFn, command, [], cwd, true, timeoutMs),
  }
}

export const defaultShellRunner: ShellRunner = createShellRunner(spawn)

/**
 * Creates a buffered process runner for executing git commands.
 * Git is run directly without shell interpretation.
 */
export interface GitRunner {
  run: (gitArguments: string[], cwd: string) => Promise<ProcessResult>
}

export function createGitRunner(spawnFn: SpawnFn): GitRunner {
  return {
    run: (gitArguments, cwd) =>
      runBufferedProcess(spawnFn, 'git', gitArguments, cwd, false),
  }
}

export const defaultGitRunner: GitRunner = createGitRunner(spawn)

/**
 * Core process execution with buffered output capture.
 */
function runBufferedProcess(
  spawnFn: SpawnFn,
  command: string,
  commandArguments: string[],
  cwd: string,
  shell: boolean,
  timeoutMs?: number
): Promise<ProcessResult> {
  return new Promise(resolve => {
    const proc = spawnFn(command, commandArguments, { cwd, shell })
    const chunks: string[] = []
    let resolved = false
    let timer: ReturnType<typeof setTimeout> | undefined

    if (timeoutMs !== undefined) {
      timer = setTimeout(() => {
        resolved = true
        proc.kill()
        proc.stdout?.destroy()
        proc.stderr?.destroy()
        proc.unref()
        resolve({
          exitCode: 1,
          output: chunks.join(''),
          timedOut: true,
        })
      }, timeoutMs)
    }

    proc.stdout?.on('data', (data: Buffer) => {
      chunks.push(data.toString())
    })
    proc.stderr?.on('data', (data: Buffer) => {
      chunks.push(data.toString())
    })

    proc.on('close', code => {
      if (resolved) return
      if (timer !== undefined) clearTimeout(timer)
      resolve({ exitCode: code ?? 1, output: chunks.join('') })
    })
    proc.on('error', error => {
      if (resolved) return
      if (timer !== undefined) clearTimeout(timer)
      resolve({ exitCode: 1, output: error.message })
    })
  })
}

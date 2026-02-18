/**
 * Shared process runner utilities for buffered command execution.
 *
 * Provides a unified interface for running shell commands and git commands
 * with buffered output capture.
 */

import { type ChildProcess, execFileSync, spawn } from 'node:child_process'

export interface ProcessResult {
  exitCode: number
  output: string
  timedOut?: boolean
}

export type SpawnFn = (
  command: string,
  commandArguments: string[],
  options: { cwd: string; shell?: boolean }
) => ChildProcess

/**
 * Creates a buffered process runner for executing shell commands.
 * Commands are run with shell: true for command string interpretation.
 * Descendant processes are tracked and killed when the command completes,
 * preventing orphaned child processes from lingering.
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
 * Recursively collects all descendant PIDs of a process.
 * Used to track child processes that may outlive the shell command.
 */
function collectDescendantPids(pid: number, pids: Set<number>) {
  try {
    const output = execFileSync('pgrep', ['-P', String(pid)], {
      encoding: 'utf-8',
    })
    for (const line of output.trim().split('\n')) {
      const childPid = Number.parseInt(line, 10)
      if (childPid) {
        pids.add(childPid)
        collectDescendantPids(childPid, pids)
      }
    }
  } catch {
    // pgrep exits non-zero when no matches found
  }
}

/**
 * Core process execution with buffered output capture.
 *
 * For shell commands, descendant PIDs are periodically recorded while
 * the command runs. When the command exits (or times out), all recorded
 * descendants are killed. This prevents orphaned grandchild processes
 * (e.g. servers started by test runners) from lingering after the
 * check completes.
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

    const descendantPids = new Set<number>()
    let scanner: ReturnType<typeof setInterval> | undefined
    if (shell && proc.pid !== undefined) {
      const pid = proc.pid
      scanner = setInterval(
        () => collectDescendantPids(pid, descendantPids),
        500
      )
    }

    function killDescendants() {
      if (scanner !== undefined) clearInterval(scanner)
      if (proc.pid !== undefined) {
        collectDescendantPids(proc.pid, descendantPids)
      }
      for (const pid of descendantPids) {
        try {
          process.kill(pid, 'SIGTERM')
        } catch {
          // Process may already be gone
        }
      }
    }

    if (timeoutMs !== undefined) {
      timer = setTimeout(() => {
        resolved = true
        proc.kill()
        if (shell) killDescendants()
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

    // Use 'exit' for shell commands so we resolve before waiting for
    // grandchild stdio handles to close (which may never happen if
    // descendants hold inherited pipes open).
    const doneEvent = shell ? 'exit' : 'close'

    proc.on(doneEvent, (code: number | null) => {
      if (resolved) return
      if (timer !== undefined) clearTimeout(timer)
      if (shell) {
        killDescendants()
        proc.stdout?.destroy()
        proc.stderr?.destroy()
      }
      resolved = true
      resolve({ exitCode: code ?? 1, output: chunks.join('') })
    })
    proc.on('error', error => {
      if (resolved) return
      if (timer !== undefined) clearTimeout(timer)
      if (shell && scanner !== undefined) clearInterval(scanner)
      resolved = true
      resolve({ exitCode: 1, output: error.message })
    })
  })
}

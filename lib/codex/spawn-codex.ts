import { spawn as nodeSpawn } from 'node:child_process'
import { createInterface as nodeCreateInterface } from 'node:readline'
import type { RawEvent, SpawnOptions } from '../claude/types'

export interface EventSourceDependencies {
  spawn: typeof nodeSpawn
  createInterface: typeof nodeCreateInterface
}

export const defaultDependencies: EventSourceDependencies = {
  spawn: nodeSpawn,
  createInterface: nodeCreateInterface,
}

export async function* spawnCodex(
  prompt: string,
  options: SpawnOptions = {},
  dependencies: EventSourceDependencies = defaultDependencies
): AsyncGenerator<RawEvent> {
  const { cwd, env, signal } = options

  const codexArguments = ['exec', prompt, '--json', '--yolo']

  if (cwd) {
    codexArguments.push('--cd', cwd)
  }

  const proc = dependencies.spawn('codex', codexArguments, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  })

  if (!proc.stdout) {
    throw new Error('Failed to get stdout from codex process')
  }

  // Capture stderr eagerly to avoid deadlocks if stderr output is verbose.
  let stderrOutput = ''
  proc.stderr?.on('data', (data: Buffer) => {
    stderrOutput += data.toString()
  })

  const closePromise = new Promise<void>((resolve, reject) => {
    proc.on('close', code => {
      if (code === 0 || code === null) resolve()
      else {
        const errMsg = stderrOutput.trim()
          ? `codex exited with code ${code}: ${stderrOutput.trim()}`
          : `codex exited with code ${code}`
        reject(new Error(errMsg))
      }
    })
    proc.on('error', reject)
  })

  const abortHandler = () => {
    if (!proc.killed) {
      proc.kill()
    }
  }

  if (signal?.aborted) {
    abortHandler()
  } else if (signal) {
    signal.addEventListener('abort', abortHandler, { once: true })
  }

  const rl = dependencies.createInterface({ input: proc.stdout })

  try {
    for await (const line of rl) {
      if (!line.trim()) continue

      try {
        yield JSON.parse(line) as RawEvent
      } catch {
        // Skip malformed JSON lines
      }
    }
    await closePromise
  } finally {
    signal?.removeEventListener('abort', abortHandler)
    ;(rl as { close?: () => void }).close?.()
  }
}

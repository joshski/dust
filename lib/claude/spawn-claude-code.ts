import { spawn as nodeSpawn } from 'node:child_process'
import { createInterface as nodeCreateInterface } from 'node:readline'
import type { RawEvent, SpawnOptions } from './types'

export interface EventSourceDependencies {
  spawn: typeof nodeSpawn
  createInterface: typeof nodeCreateInterface
}

export const defaultDependencies: EventSourceDependencies = {
  spawn: nodeSpawn,
  createInterface: nodeCreateInterface,
}

export async function* spawnClaudeCode(
  prompt: string,
  options: SpawnOptions = {},
  dependencies: EventSourceDependencies = defaultDependencies
): AsyncGenerator<RawEvent> {
  const {
    cwd,
    allowedTools,
    maxTurns,
    model,
    systemPrompt,
    sessionId,
    dangerouslySkipPermissions,
    env,
    signal,
  } = options

  const claudeArguments = [
    '-p',
    prompt,
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-partial-messages',
  ]

  if (allowedTools?.length) {
    claudeArguments.push('--allowedTools', ...allowedTools)
  }
  if (maxTurns) {
    claudeArguments.push('--max-turns', String(maxTurns))
  }
  if (model) {
    claudeArguments.push('--model', model)
  }
  if (systemPrompt) {
    claudeArguments.push('--system-prompt', systemPrompt)
  }
  if (sessionId) {
    claudeArguments.push('--session-id', sessionId)
  }
  if (dangerouslySkipPermissions) {
    claudeArguments.push('--dangerously-skip-permissions')
  }

  const proc = dependencies.spawn('claude', claudeArguments, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  })

  if (!proc.stdout) {
    throw new Error('Failed to get stdout from claude process')
  }

  // Capture stderr eagerly to prevent pipe buffer from filling up and
  // deadlocking the child process (classic pipe deadlock: if nobody reads
  // stderr, the OS buffer fills, the process blocks on write, stdout never
  // closes, and our for-await on stdout hangs forever).
  let stderrOutput = ''
  proc.stderr?.on('data', (data: Buffer) => {
    stderrOutput += data.toString()
  })

  const closePromise = new Promise<void>((resolve, reject) => {
    proc.on('close', code => {
      if (code === 0 || code === null) resolve()
      else {
        const errMsg = stderrOutput.trim()
          ? `claude exited with code ${code}: ${stderrOutput.trim()}`
          : `claude exited with code ${code}`
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

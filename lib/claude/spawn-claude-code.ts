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
  } = options

  const args = [
    '-p',
    prompt,
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-partial-messages',
  ]

  if (allowedTools?.length) {
    args.push('--allowedTools', ...allowedTools)
  }
  if (maxTurns) {
    args.push('--max-turns', String(maxTurns))
  }
  if (model) {
    args.push('--model', model)
  }
  if (systemPrompt) {
    args.push('--system-prompt', systemPrompt)
  }
  if (sessionId) {
    args.push('--session-id', sessionId)
  }
  if (dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions')
  }

  const proc = dependencies.spawn('claude', args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (!proc.stdout) {
    throw new Error('Failed to get stdout from claude process')
  }

  const rl = dependencies.createInterface({ input: proc.stdout })

  for await (const line of rl) {
    if (!line.trim()) continue

    try {
      yield JSON.parse(line) as RawEvent
    } catch {
      // Skip malformed JSON lines
    }
  }

  await new Promise<void>((resolve, reject) => {
    proc.on('close', code => {
      if (code === 0 || code === null) resolve()
      else reject(new Error(`claude exited with code ${code}`))
    })
    proc.on('error', reject)
  })
}

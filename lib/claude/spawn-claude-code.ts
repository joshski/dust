import { spawn as nodeSpawn } from 'node:child_process'
import { createInterface as nodeCreateInterface } from 'node:readline'
import { createLogger } from '../logging'
import type { DockerSpawnConfig, RawEvent, SpawnOptions } from './types'

const debug = createLogger('dust.claude.spawn-claude-code')

export interface EventSourceDependencies {
  spawn: typeof nodeSpawn
  createInterface: typeof nodeCreateInterface
}

export const defaultDependencies: EventSourceDependencies = {
  spawn: nodeSpawn,
  createInterface: nodeCreateInterface,
}

/**
 * Build docker run arguments for spawning claude in a container.
 */
export function buildDockerRunArguments(
  docker: DockerSpawnConfig,
  claudeArguments: string[],
  env: Record<string, string>
): string[] {
  const dockerArguments: string[] = [
    'run',
    '--rm',
    '-i',
    // Mount the repository at /workspace
    '-v',
    `${docker.repoPath}:/workspace`,
    // Set working directory
    '-w',
    '/workspace',
    // Mount .claude read-write so Claude Code can refresh OAuth tokens
    '-v',
    `${docker.homeDir}/.claude:/home/user/.claude`,
    // Mount .claude.json for Claude Code configuration
    '-v',
    `${docker.homeDir}/.claude.json:/home/user/.claude.json`,
    // Set HOME so Claude Code finds its config files
    '-e',
    'HOME=/home/user',
  ]

  // Configure git to use the proxy for known hosts when gitProxyUrl is set
  if (docker.gitProxyUrl) {
    dockerArguments.push('-e', `GIT_PROXY_URL=${docker.gitProxyUrl}`)
    // Configure git URL rewriting to route through the proxy
    // This makes git clone https://github.com/... use http://<proxy>/github.com/... instead
    dockerArguments.push(
      '-e',
      'GIT_CONFIG_COUNT=2',
      '-e',
      `GIT_CONFIG_KEY_0=url.${docker.gitProxyUrl}/github.com/.insteadOf`,
      '-e',
      'GIT_CONFIG_VALUE_0=https://github.com/',
      '-e',
      `GIT_CONFIG_KEY_1=url.${docker.gitProxyUrl}/github.com/.insteadOf`,
      '-e',
      'GIT_CONFIG_VALUE_1=git@github.com:'
    )
  }

  // Pass through environment variables
  for (const [key, value] of Object.entries(env)) {
    dockerArguments.push('-e', `${key}=${value}`)
  }

  // Pass through agent auth tokens if set in the host environment
  for (const key of ['CLAUDE_CODE_OAUTH_TOKEN', 'OPENAI_API_KEY']) {
    if (process.env[key] && !(key in env)) {
      dockerArguments.push('-e', `${key}=${process.env[key]}`)
    }
  }

  // Add image tag and claude command with arguments
  dockerArguments.push(docker.imageTag)
  dockerArguments.push('claude')
  dockerArguments.push(...claudeArguments)

  return dockerArguments
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
    docker,
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

  // Spawn either directly or via Docker
  const mergedEnv = { ...process.env, ...env }
  const proc = docker
    ? dependencies.spawn(
        'docker',
        buildDockerRunArguments(docker, claudeArguments, env ?? {}),
        {
          cwd,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: mergedEnv,
        }
      )
    : dependencies.spawn('claude', claudeArguments, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: mergedEnv,
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
        debug('Skipping malformed JSON line: %s', line.slice(0, 200))
      }
    }
    await closePromise
  } finally {
    signal?.removeEventListener('abort', abortHandler)
    ;(rl as { close?: () => void }).close?.()
  }
}

import { spawn as nodeSpawn } from 'node:child_process'
import { createInterface as nodeCreateInterface } from 'node:readline'
import { createLogger } from '../logging'
import type {
  CreateReadlineForEvents,
  SpawnForEvents,
} from '../process/spawn-contract'
import type { DockerSpawnConfig, RawEvent, SpawnOptions } from './types'

const debug = createLogger('dust.claude.spawn-claude-code')

export interface EventSourceDependencies {
  spawn: SpawnForEvents
  createInterface: CreateReadlineForEvents
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
    // Set HOME so Claude Code finds its config files
    '-e',
    'HOME=/home/user',
  ]

  // When using Claude API proxy, don't mount credential files
  // The proxy handles OAuth token management on the host side
  if (!docker.claudeApiProxyUrl) {
    // Mount .claude read-write so Claude Code can refresh OAuth tokens
    dockerArguments.push(
      '-v',
      `${docker.homeDir}/.claude:/home/user/.claude`,
      // Mount .claude.json for Claude Code configuration
      '-v',
      `${docker.homeDir}/.claude.json:/home/user/.claude.json`
    )
  }

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

  // Configure Claude Code to use the API proxy
  if (docker.claudeApiProxyUrl) {
    dockerArguments.push('-e', `ANTHROPIC_BASE_URL=${docker.claudeApiProxyUrl}`)
    // Provide a dummy auth token so Claude Code starts without real credentials.
    // The proxy will strip this and inject the real OAuth token on the host side.
    dockerArguments.push('-e', 'ANTHROPIC_AUTH_TOKEN=proxy-managed')
  }

  // Ensure commits inside Docker containers have a deterministic identity.
  // Callers can still override these by passing explicit values in `env`.
  const gitIdentityDefaults = {
    GIT_AUTHOR_NAME: 'Dust Agent',
    GIT_AUTHOR_EMAIL: 'agent@dustbucket.com',
    GIT_COMMITTER_NAME: 'Dust Agent',
    GIT_COMMITTER_EMAIL: 'agent@dustbucket.com',
  }
  for (const [key, value] of Object.entries(gitIdentityDefaults)) {
    if (!(key in env)) {
      dockerArguments.push('-e', `${key}=${value}`)
    }
  }

  // Pass through environment variables
  for (const [key, value] of Object.entries(env)) {
    dockerArguments.push('-e', `${key}=${value}`)
  }

  // Pass through agent auth tokens if set in the host environment
  // When using the API proxy, don't pass CLAUDE_CODE_OAUTH_TOKEN — secrets stay on the host.
  const tokensToPassThrough = docker.claudeApiProxyUrl
    ? ['OPENAI_API_KEY']
    : ['CLAUDE_CODE_OAUTH_TOKEN', 'OPENAI_API_KEY']

  for (const key of tokensToPassThrough) {
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

/**
 * Build claude command arguments from spawn options.
 */
function buildClaudeArguments(prompt: string, options: SpawnOptions): string[] {
  const result = [
    '-p',
    prompt,
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-partial-messages',
  ]

  if (options.allowedTools?.length) {
    result.push('--allowedTools', ...options.allowedTools)
  }
  if (options.maxTurns) {
    result.push('--max-turns', String(options.maxTurns))
  }
  if (options.model) {
    result.push('--model', options.model)
  }
  if (options.systemPrompt) {
    result.push('--system-prompt', options.systemPrompt)
  }
  if (options.sessionId) {
    result.push('--session-id', options.sessionId)
  }
  if (options.dangerouslySkipPermissions) {
    result.push('--dangerously-skip-permissions')
  }

  return result
}

export async function* spawnClaudeCode(
  prompt: string,
  options: SpawnOptions = {},
  dependencies: EventSourceDependencies = defaultDependencies
): AsyncGenerator<RawEvent> {
  const { cwd, env, signal, docker } = options

  const claudeArguments = buildClaudeArguments(prompt, options)

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
    rl.close?.()
  }
}

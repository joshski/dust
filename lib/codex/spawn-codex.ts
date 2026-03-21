import { spawn as nodeSpawn } from 'node:child_process'
import { createInterface as nodeCreateInterface } from 'node:readline'
import type { DockerSpawnConfig, RawEvent, SpawnOptions } from '../claude/types'
import { createLogger } from '../logging'
import type {
  CreateReadlineForEvents,
  SpawnForEvents,
} from '../process/spawn-contract'

const debug = createLogger('dust.codex.spawn-codex')

export interface EventSourceDependencies {
  spawn: SpawnForEvents
  createInterface: CreateReadlineForEvents
}

export const defaultDependencies: EventSourceDependencies = {
  spawn: nodeSpawn,
  createInterface: nodeCreateInterface,
}

/**
 * Build docker run arguments for spawning codex in a container.
 */
export function buildDockerRunArguments(
  docker: DockerSpawnConfig,
  codexArguments: string[],
  env: Record<string, string>
): string[] {
  const dockerArguments: string[] = [
    'run',
    '--rm',
    '-i',
    '-v',
    `${docker.repoPath}:/workspace`,
    '-w',
    '/workspace',
    '-e',
    'HOME=/home/user',
  ]

  const hostCodexHome = process.env.CODEX_HOME ?? `${docker.homeDir}/.codex`
  dockerArguments.push(
    '-v',
    `${hostCodexHome}:/home/user/.codex`,
    '-e',
    'CODEX_HOME=/home/user/.codex'
  )

  if (docker.gitProxyUrl) {
    dockerArguments.push('-e', `GIT_PROXY_URL=${docker.gitProxyUrl}`)
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

  for (const [key, value] of Object.entries(env)) {
    dockerArguments.push('-e', `${key}=${value}`)
  }

  if (process.env.OPENAI_API_KEY && !('OPENAI_API_KEY' in env)) {
    dockerArguments.push('-e', `OPENAI_API_KEY=${process.env.OPENAI_API_KEY}`)
  }

  dockerArguments.push(docker.imageTag)
  dockerArguments.push('codex')
  dockerArguments.push(...codexArguments)
  return dockerArguments
}

export async function* spawnCodex(
  prompt: string,
  options: SpawnOptions = {},
  dependencies: EventSourceDependencies = defaultDependencies
): AsyncGenerator<RawEvent> {
  const { cwd, env, signal, docker } = options

  const codexArguments = ['exec', prompt, '--json', '--yolo']

  if (cwd) {
    codexArguments.push('--cd', docker ? '/workspace' : cwd)
  }

  const mergedEnv = { ...process.env, ...env }
  const proc = docker
    ? dependencies.spawn(
        'docker',
        buildDockerRunArguments(docker, codexArguments, env ?? {}),
        {
          cwd,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: mergedEnv,
        }
      )
    : dependencies.spawn('codex', codexArguments, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: mergedEnv,
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
  // Prevent unhandled rejection if generator is abandoned before closePromise is awaited
  closePromise.catch(() => {})

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
        debug(`Skipping malformed JSON line: ${line.slice(0, 200)}`)
      }
    }
    await closePromise
  } finally {
    signal?.removeEventListener('abort', abortHandler)
    rl.close?.()
  }
}

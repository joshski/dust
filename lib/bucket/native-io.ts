/**
 * Native I/O wrappers for bucket-worker.
 *
 * These are thin imperative shell functions that wrap Node.js/Bun native APIs.
 * They are separated into this file to allow bucket-worker.ts to maintain
 * coverage tracking while these untestable native wrappers are excluded.
 */

import { spawn as nodeSpawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { accessSync, statSync } from 'node:fs'
import { chmod, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { homedir, platform, release } from 'node:os'
import { join } from 'node:path'
import { readEnvConfig } from '../env-config'
import { createLocalServer } from './auth-server'
import {
  discoverAgentCapabilities,
  type AgentCapability,
} from './agent-capabilities'
import type { WebSocketLike } from './events'
import { getReposDir } from './paths'
import {
  createAuthFileSystem,
  type BucketDependencies,
} from './bucket-dependencies'
import {
  buildConnectionInitPayload,
  type ConnectionInitMessage,
} from './server-messages'

/** Opens a URL in the system browser. */
function openBrowser(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open'
  nodeSpawn(cmd, [url], { stdio: 'ignore', detached: true }).unref()
}

function adaptWebSocket(ws: WebSocket): WebSocketLike {
  const emitter = new EventEmitter()
  let currentReadyState = ws.readyState

  ws.addEventListener('open', () => {
    currentReadyState = ws.readyState
    emitter.emit('open')
  })

  ws.addEventListener('close', event => {
    currentReadyState = ws.readyState
    emitter.emit('close', { code: event.code, reason: event.reason })
  })

  ws.addEventListener('error', event => {
    const maybeError = (event as { error?: unknown }).error
    const error =
      maybeError instanceof Error ? maybeError : new Error('WebSocket error')
    emitter.emit('error', error)
  })

  ws.addEventListener('message', event => {
    emitter.emit('message', { data: String(event.data) })
  })

  return {
    addEventListener: emitter.on.bind(emitter),
    close: ws.close.bind(ws),
    send: ws.send.bind(ws),
    get readyState() {
      return currentReadyState
    },
  }
}

function defaultCreateWebSocket(url: string, token: string): WebSocketLike {
  const ws = new WebSocket(url, {
    // @ts-expect-error - Bun's WebSocket accepts headers option
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return adaptWebSocket(ws)
}

function defaultSetupKeypress(onKey: (key: string) => void): () => void {
  const stdin = process.stdin
  if (!stdin.isTTY) {
    return () => {}
  }

  stdin.setRawMode(true)
  stdin.resume()
  stdin.setEncoding('utf8')

  const handler = (key: string) => {
    onKey(key)
  }

  stdin.on('data', handler)

  return () => {
    stdin.removeListener('data', handler)
    stdin.setRawMode(false)
    stdin.pause()
  }
}

function defaultSetupSignals(onSignal: () => void): () => void {
  const handler = onSignal

  process.on('SIGINT', handler)
  process.on('SIGTERM', handler)

  return () => {
    process.removeListener('SIGINT', handler)
    process.removeListener('SIGTERM', handler)
  }
}

function defaultSetupResize(
  onResize: (width: number, height: number) => void
): () => void {
  const handler = () => {
    const { columns, rows } = process.stdout
    onResize(columns ?? 80, rows ?? 24)
  }

  process.stdout.on('resize', handler)

  return () => {
    process.stdout.removeListener('resize', handler)
  }
}

function defaultGetTerminalSize(): { width: number; height: number } {
  return {
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24,
  }
}

function defaultWriteStdout(data: string): void {
  process.stdout.write(data)
}

/**
 * Get the dust version from package.json.
 * Returns 'unknown' if version cannot be determined.
 */
function getDustVersion(): string {
  // Import the version from the build-time embedded package.json
  // This is available at runtime via dynamic import
  try {
    return require('../../package.json').version || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Get the platform string in the format "os.platform os.release".
 */
function getPlatformString(): string {
  return `${platform()} ${release()}`
}

/**
 * Get the git remote URL for the current directory.
 * Returns undefined if git remote is not available.
 */
async function getGitRemote(
  spawn: typeof nodeSpawn
): Promise<string | undefined> {
  return new Promise(resolve => {
    try {
      const proc = spawn('git', ['remote', 'get-url', 'origin'], {
        stdio: ['ignore', 'pipe', 'ignore'],
      })

      let stdout = ''

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      proc.on('close', code => {
        if (code === 0 && stdout.trim()) {
          resolve(stdout.trim())
        } else {
          resolve(undefined)
        }
      })

      proc.on('error', () => {
        resolve(undefined)
      })
    } catch {
      resolve(undefined)
    }
  })
}

/**
 * Build a ConnectionInitMessage with version, platform, git remote, machine ID, and agents.
 * This is the imperative shell that gathers all the information needed.
 */
async function defaultBuildConnectionInit(
  spawn: typeof nodeSpawn
): Promise<ConnectionInitMessage> {
  const dustVersion = getDustVersion()
  const platformStr = getPlatformString()

  const io: MachineIdIO = {
    getEnv: (key: string) => process.env[key],
    readFile,
    getHostname: () => require('node:os').hostname(),
  }

  const [gitRemote, capabilitiesMessage, machineId] = await Promise.all([
    getGitRemote(spawn),
    discoverAgentCapabilities({ spawn }),
    getMachineId(io),
  ])

  const agents: AgentCapability[] = capabilitiesMessage.agents

  return buildConnectionInitPayload(
    dustVersion,
    platformStr,
    gitRemote,
    agents,
    machineId
  )
}

/**
 * IO dependencies for machine ID operations.
 * This interface enables testing by allowing injection of file system operations.
 */
export interface MachineIdIO {
  /** Read environment variable */
  getEnv: (key: string) => string | undefined
  /** Read file contents */
  readFile: (path: string, encoding: 'utf8') => Promise<string>
  /** Get OS hostname */
  getHostname: () => string
}

/**
 * Get the stable machine identifier.
 *
 * Precedence (first non-empty value wins):
 * 1. DUST_MACHINE_ID environment variable
 * 2. ~/.dust/machine-id file contents
 * 3. os.hostname()
 *
 * Returns a trimmed, non-empty string.
 * This is a pure function when io dependencies are pure.
 */
export async function getMachineId(io: MachineIdIO): Promise<string> {
  // 1. Check environment variable
  const envMachineId = io.getEnv('DUST_MACHINE_ID')
  if (envMachineId && envMachineId.trim()) {
    return envMachineId.trim()
  }

  // 2. Check ~/.dust/machine-id file
  try {
    const homeDir = homedir()
    const machineIdPath = join(homeDir, '.dust', 'machine-id')
    const fileContent = await io.readFile(machineIdPath, 'utf8')
    const trimmedContent = fileContent.trim()
    if (trimmedContent) {
      return trimmedContent
    }
  } catch {
    // File doesn't exist or can't be read, continue to fallback
  }

  // 3. Fallback to hostname
  return io.getHostname()
}

/**
 * Store a machine ID to ~/.dust/machine-id.
 * Creates the ~/.dust directory if it doesn't exist.
 * Throws if the machine ID is empty after trimming.
 */
export async function storeMachineId(
  machineId: string,
  homeDir: string,
  mkdirFn: typeof mkdir,
  writeFileFn: typeof writeFile
): Promise<void> {
  const trimmedId = machineId.trim()
  if (!trimmedId) {
    throw new Error('Machine ID cannot be empty or whitespace-only')
  }

  const dustDir = join(homeDir, '.dust')
  const machineIdPath = join(dustDir, 'machine-id')

  // Ensure .dust directory exists
  await mkdirFn(dustDir, { recursive: true })

  // Write machine ID to file
  await writeFileFn(machineIdPath, trimmedId, 'utf8')
}

export function createDefaultBucketDependencies(): BucketDependencies {
  const envConfig = readEnvConfig(process.env)
  const authFileSystem = createAuthFileSystem({
    accessSync,
    statSync,
    readFile,
    writeFile,
    mkdir,
    readdir,
    chmod,
    rename: (oldPath, newPath) =>
      import('node:fs/promises').then(mod => mod.rename(oldPath, newPath)),
  })

  return {
    spawn: nodeSpawn,
    createWebSocket: defaultCreateWebSocket,
    buildConnectionInit: () => defaultBuildConnectionInit(nodeSpawn),
    setupKeypress: defaultSetupKeypress,
    setupSignals: defaultSetupSignals,
    setupResize: defaultSetupResize,
    getTerminalSize: defaultGetTerminalSize,
    writeStdout: defaultWriteStdout,
    isTTY: process.stdout.isTTY ?? false,
    sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    getReposDir: () => getReposDir(envConfig.session, homedir()),
    createInterval: setInterval,
    clearInterval: (id: unknown) =>
      clearInterval(id as ReturnType<typeof setInterval>),
    auth: {
      createServer: createLocalServer,
      openBrowser: openBrowser,
      getHomeDir: () => homedir(),
      fileSystem: authFileSystem,
      bucketConfig: envConfig.bucket,
    },
    authConfig: envConfig.auth,
    bucket: envConfig.bucket,
    session: envConfig.session,
    runtime: envConfig.runtime,
  }
}

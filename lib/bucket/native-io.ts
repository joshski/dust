/**
 * Native I/O wrappers for bucket-worker.
 *
 * These are thin imperative shell functions that wrap Node.js/Bun native APIs.
 * They are separated into this file to allow bucket-worker.ts to maintain
 * coverage tracking while these untestable native wrappers are excluded.
 */

import { spawn as nodeSpawn } from 'node:child_process'
import { accessSync, statSync } from 'node:fs'
import { chmod, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { createLocalServer, openBrowser } from './auth-server'
import { discoverAgentCapabilities } from './agent-capabilities'
import type { WebSocketLike } from './events'
import { getReposDir } from './paths'
import {
  createAuthFileSystem,
  type BucketDependencies,
} from '../cli/commands/bucket-worker'

/* v8 ignore start */
function adaptWebSocket(ws: WebSocket): WebSocketLike {
  const adapter: WebSocketLike = {
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
    close: () => ws.close(),
    send: (data: string) => ws.send(data),
    readyState: ws.readyState,
  }

  ws.addEventListener('open', () => {
    adapter.readyState = ws.readyState
    adapter.onopen?.()
  })

  ws.addEventListener('close', event => {
    adapter.readyState = ws.readyState
    adapter.onclose?.({ code: event.code, reason: event.reason })
  })

  ws.addEventListener('error', event => {
    const maybeError = (event as { error?: unknown }).error
    const error =
      maybeError instanceof Error ? maybeError : new Error('WebSocket error')
    adapter.onerror?.(error)
  })

  ws.addEventListener('message', event => {
    adapter.onmessage?.({ data: String(event.data) })
  })

  return adapter
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
  const handler = () => onSignal()

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

export function createDefaultBucketDependencies(): BucketDependencies {
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
    discoverAgentCapabilities: () =>
      discoverAgentCapabilities({
        spawn: nodeSpawn,
      }),
    setupKeypress: defaultSetupKeypress,
    setupSignals: defaultSetupSignals,
    setupResize: defaultSetupResize,
    getTerminalSize: defaultGetTerminalSize,
    writeStdout: defaultWriteStdout,
    isTTY: process.stdout.isTTY ?? false,
    sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    getReposDir: () => getReposDir(process.env, homedir()),
    auth: {
      createServer: createLocalServer,
      openBrowser: openBrowser,
      getHomeDir: () => homedir(),
      fileSystem: authFileSystem,
    },
  }
}
/* v8 ignore stop */

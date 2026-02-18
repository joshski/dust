/**
 * File-based log sink — the imperative shell for debug logging.
 *
 * Lazily creates `<cwd>/log/dust/<scope>.log` and appends lines to it.
 * The scope defaults to "debug" but can be changed via setLogScope()
 * so that different commands write to separate log files.
 */

import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export type WriteFn = (line: string) => void

/* v8 ignore start - thin wrapper around fs, tested via integration */
let logPath: string | undefined
let ready = false
let scope = process.env.DEBUG_LOG_SCOPE || 'debug'

function ensureLogFile(): string | undefined {
  if (ready) return logPath
  ready = true

  const dir = join(process.cwd(), 'log', 'dust')
  logPath = join(dir, `${scope}.log`)
  try {
    mkdirSync(dir, { recursive: true })
  } catch {
    logPath = undefined
  }
  return logPath
}

/**
 * Set the log scope, which determines the output filename.
 * Must be called before any logger writes (i.e. at command startup).
 *
 * For example, `setLogScope('loop')` writes to `log/dust/loop.log`.
 */
export function setLogScope(name: string): void {
  scope = name
  process.env.DEBUG_LOG_SCOPE = name
  // Reset so the next write picks up the new filename
  logPath = undefined
  ready = false
}

/**
 * Write a line to the debug log file.
 * Silently no-ops if the file cannot be opened.
 */
export const writeToFile: WriteFn = (line: string) => {
  const path = ensureLogFile()
  if (!path) return
  try {
    appendFileSync(path, line)
  } catch {
    // Best-effort — never crash the caller
  }
}

/**
 * Reset sink state (for testing only).
 */
export function _resetSink(): void {
  logPath = undefined
  ready = false
  scope = 'debug'
  delete process.env.DEBUG_LOG_SCOPE
}
/* v8 ignore stop */

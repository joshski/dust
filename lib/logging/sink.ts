/**
 * File-based log sink — the imperative shell for debug logging.
 *
 * Lazily creates `<cwd>/log/dust/debug.log` and appends lines to it.
 */

import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export type WriteFn = (line: string) => void

/* v8 ignore start - thin wrapper around fs, tested via integration */
let logPath: string | undefined
let ready = false

function ensureLogFile(): string | undefined {
  if (ready) return logPath
  ready = true

  const dir = join(process.cwd(), 'log', 'dust')
  logPath = join(dir, 'debug.log')
  try {
    mkdirSync(dir, { recursive: true })
  } catch {
    logPath = undefined
  }
  return logPath
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
}
/* v8 ignore stop */

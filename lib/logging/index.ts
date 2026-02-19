/**
 * Minimal debug logging framework.
 *
 * Two independent output channels:
 *
 * - **File logging** — activated by `enableFileLogs(scope)` at command startup.
 *   Writes all logs to `./log/<scope>.log` by default. Two env vars control routing:
 *
 *   Routing rules for enableFileLogs(scope):
 *   1. If DUST_LOG_FILE is already set (inherited from a parent process such as
 *      `dust check`), use that path — all scopes land in the same file.
 *   2. Otherwise compute the path from DUST_LOG_DIR (if set) or `<cwd>/log`, set
 *      DUST_LOG_FILE so child processes inherit the same destination, then write there.
 *
 * - **Stdout logging** — activated by `DEBUG=pattern`. Writes matching logs to
 *   stdout. Works in any command, regardless of whether file logging is enabled.
 *
 * DEBUG is a comma-separated list of match expressions. Each expression
 * can contain `*` as a wildcard (matches any sequence of characters).
 *
 * Examples:
 *   DEBUG=*                      → matches all loggers
 *   DEBUG=dust.bucket,dust.loop  → exact matches
 *   DEBUG=dust.bucket.*          → matches dust.bucket.loop, dust.bucket.ws, etc.
 *   DEBUG=*loop                  → matches dust.cli.commands.loop, dust.bucket.loop, etc.
 *
 * Logger names follow the convention `dust.<path>` mirroring the directory
 * structure under `lib/`. For example, `lib/bucket/repository-loop.ts` uses
 * the logger name `dust.bucket.repository-loop`.
 *
 * No external dependencies.
 */

import { join } from 'node:path'
import { formatLine, matchesAny, parsePatterns } from './match'
import { FileSink, type LogSink } from './sink'

export type LogFn = (...messages: unknown[]) => void

const DUST_LOG_FILE = 'DUST_LOG_FILE'

let patterns: RegExp[] | null = null
let initialized = false
let activeFileSink: LogSink | null = null
let ownedDustLogFile = false // true if we set DUST_LOG_FILE (vs inherited it)

function init(): void {
  if (initialized) return
  initialized = true
  const parsed = parsePatterns(process.env.DEBUG)
  patterns = parsed.length > 0 ? parsed : null
}

/**
 * Activate file logging for this command. Determines the log path as follows:
 * - If DUST_LOG_FILE is already set (inherited from a parent process such as
 *   `dust check`), use that path — all scopes land in the same file.
 * - Otherwise compute the path using DUST_LOG_DIR (if set) or `<cwd>/log`, set
 *   DUST_LOG_FILE so that any child processes inherit the same destination, then write there.
 *
 * Pass a LogSink as the second argument to override for testing.
 */
export function enableFileLogs(scope: string, _sinkForTesting?: LogSink): void {
  const existing = process.env[DUST_LOG_FILE]
  const logDir = process.env.DUST_LOG_DIR ?? join(process.cwd(), 'log')
  const path = existing ?? join(logDir, `${scope}.log`)

  if (!existing) {
    process.env[DUST_LOG_FILE] = path
    ownedDustLogFile = true
  }

  activeFileSink = _sinkForTesting ?? new FileSink(path)
}

/**
 * Create a named logger function. The returned function writes to:
 * - The active file sink (if `enableFileLogs` was called), always, no filtering.
 * - `process.stdout` if DEBUG is set and `name` matches the pattern.
 *
 * @param name - Logger name, e.g. `dust.bucket.loop`
 */
export function createLogger(name: string): LogFn {
  return (...messages: unknown[]) => {
    init()
    const line = formatLine(name, messages)

    if (activeFileSink) {
      activeFileSink.write(line)
    }

    if (patterns && matchesAny(name, patterns)) {
      process.stdout.write(line)
    }
  }
}

/**
 * Check whether a logger name would produce stdout output under the current DEBUG value.
 */
export function isEnabled(name: string): boolean {
  init()
  return patterns !== null && matchesAny(name, patterns)
}

/**
 * Reset internal state (for testing only).
 * Clears DUST_LOG_FILE only if this module set it (not if it was inherited).
 */
export function _reset(): void {
  initialized = false
  patterns = null
  activeFileSink = null
  if (ownedDustLogFile) {
    delete process.env[DUST_LOG_FILE]
    ownedDustLogFile = false
  }
}

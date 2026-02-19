/**
 * Minimal debug logging framework.
 *
 * Two independent output channels:
 *
 * - **File logging** — activated by `enableFileLogs(scope)` at command startup.
 *   Writes all logs unfiltered to `~/.dust/logs/<scope>.log`. Not affected by DEBUG.
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

import { formatLine, matchesAny, parsePatterns } from './match'
import { FileSink, type LogSink } from './sink'

export type LogFn = (...messages: unknown[]) => void

let patterns: RegExp[] | null = null
let initialized = false
let activeFileSink: LogSink | null = null

function init(): void {
  if (initialized) return
  initialized = true
  const parsed = parsePatterns(process.env.DEBUG)
  patterns = parsed.length > 0 ? parsed : null
}

/**
 * Activate file logging for long-running commands. All log lines are written
 * to `~/.dust/logs/<scope>.log` unfiltered (ignoring DEBUG).
 *
 * Pass a LogSink as the second argument to override for testing.
 */
export function enableFileLogs(scope: string, _sinkForTesting?: LogSink): void {
  activeFileSink = _sinkForTesting ?? new FileSink(scope)
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
 */
export function _reset(): void {
  initialized = false
  patterns = null
  activeFileSink = null
}

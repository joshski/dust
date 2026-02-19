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
 * ## Per-logger file routing
 *
 * `createLogger(name, { file })` accepts an optional `file` override:
 * - `file: "path/to/file.log"` — route this logger to a dedicated file instead
 *   of the global sink set by `enableFileLogs`. The path is resolved relative to
 *   the log directory.
 * - `file: false` — suppress file output for this logger entirely, even if
 *   `enableFileLogs` has been called. Stdout behavior (DEBUG matching) is
 *   unchanged.
 * - When `file` is omitted, the logger uses the global file sink (if any).
 *
 * Sink selection precedence: per-logger sink → global sink → no file sink.
 * File sinks are cached by path so multiple loggers targeting the same file
 * share one sink instance.
 *
 * No external dependencies.
 */

import { join } from 'node:path'
import { formatLine, matchesAny, parsePatterns } from './match'
import { FileSink, type LogSink } from './sink'

export type LogFn = (...messages: unknown[]) => void

export interface LoggerOptions {
  /**
   * Per-logger file routing override.
   * - `string` — path to a dedicated log file (e.g. `"./log/custom.log"`)
   * - `false` — suppress file output for this logger
   * - `undefined` — use the global file sink from `enableFileLogs` (default)
   */
  file?: string | false
}

const DUST_LOG_FILE = 'DUST_LOG_FILE'

let patterns: RegExp[] | null = null
let initialized = false
let activeFileSink: LogSink | null = null
let ownedDustLogFile = false // true if we set DUST_LOG_FILE (vs inherited it)

/** Cache of file sinks by path, so multiple loggers targeting the same file share one instance. */
const fileSinkCache = new Map<string, LogSink>()

function init(): void {
  if (initialized) return
  initialized = true
  const parsed = parsePatterns(process.env.DEBUG)
  patterns = parsed.length > 0 ? parsed : null
}

function getOrCreateFileSink(path: string): LogSink {
  let sink = fileSinkCache.get(path)
  if (!sink) {
    sink = new FileSink(path)
    fileSinkCache.set(path, sink)
  }
  return sink
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
 * - The per-logger file sink (if `options.file` is a path), or
 * - The active global file sink (if `enableFileLogs` was called and `options.file` is not `false`), or
 * - No file sink otherwise.
 * - `process.stdout` if DEBUG is set and `name` matches the pattern.
 *
 * @param name - Logger name, e.g. `dust.bucket.loop`
 * @param options - Optional per-logger configuration
 */
export function createLogger(name: string, options?: LoggerOptions): LogFn {
  // Resolve per-logger file sink eagerly if a path is provided
  let perLoggerSink: LogSink | null | undefined
  if (options?.file === false) {
    perLoggerSink = null // explicitly disabled
  } else if (typeof options?.file === 'string') {
    perLoggerSink = getOrCreateFileSink(options.file)
  }
  // undefined means "use global sink"

  return (...messages: unknown[]) => {
    init()
    const line = formatLine(name, messages)

    // Sink precedence: per-logger → global → none
    if (perLoggerSink !== undefined) {
      if (perLoggerSink !== null) {
        perLoggerSink.write(line)
      }
      // file: false → skip file output
    } else if (activeFileSink) {
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
  fileSinkCache.clear()
  if (ownedDustLogFile) {
    delete process.env[DUST_LOG_FILE]
    ownedDustLogFile = false
  }
}

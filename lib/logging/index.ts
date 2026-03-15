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
import type { LoggingConfig } from '../env-config'
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

export interface LoggingService {
  enableFileLogs(scope: string, sinkForTesting?: LogSink): void
  createLogger(name: string, options?: LoggerOptions): LogFn
  isEnabled(name: string): boolean
}

const DUST_LOG_FILE = 'DUST_LOG_FILE'

/**
 * Create an isolated logging service instance. All mutable state is
 * encapsulated inside the returned object.
 */
export interface LoggingServiceOptions {
  stdout?: (line: string) => boolean
  /**
   * Logging configuration from environment.
   * When provided, uses these values instead of reading process.env directly.
   */
  config?: LoggingConfig
  /**
   * Current working directory for default log path resolution.
   * Defaults to process.cwd().
   */
  cwd?: () => string
  /**
   * Function to set DUST_LOG_FILE for child process inheritance.
   * Defaults to setting process.env[DUST_LOG_FILE].
   */
  setLogFileEnv?: (path: string) => void
}

export function createLoggingService(
  options?: LoggingServiceOptions
): LoggingService {
  const writeStdout =
    options?.stdout ?? process.stdout.write.bind(process.stdout)
  const config = options?.config
  const getCwd = options?.cwd ?? (() => process.cwd())
  const setLogFileEnv =
    options?.setLogFileEnv ??
    ((path: string) => (process.env[DUST_LOG_FILE] = path))

  let patterns: RegExp[] | null = null
  let initialized = false
  let activeFileSink: LogSink | null = null
  const fileSinkCache = new Map<string, LogSink>()

  function init(): void {
    if (initialized) return
    initialized = true
    const debugValue = config?.debug ?? process.env.DEBUG
    const parsed = parsePatterns(debugValue)
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

  return {
    enableFileLogs(scope: string, sinkForTesting?: LogSink): void {
      const existing = config?.logFile ?? process.env[DUST_LOG_FILE]
      const logDir =
        config?.logDir ?? process.env.DUST_LOG_DIR ?? join(getCwd(), 'log')
      const path = existing ?? join(logDir, `${scope}.log`)

      if (!existing) {
        setLogFileEnv(path)
      }

      activeFileSink = sinkForTesting ?? new FileSink(path)
    },

    createLogger(name: string, loggerOptions?: LoggerOptions): LogFn {
      let perLoggerSink: LogSink | null | undefined
      if (loggerOptions?.file === false) {
        perLoggerSink = null
      } else if (typeof loggerOptions?.file === 'string') {
        perLoggerSink = getOrCreateFileSink(loggerOptions.file)
      }

      return (...messages: unknown[]) => {
        init()
        const line = formatLine(name, messages)

        if (perLoggerSink !== undefined) {
          if (perLoggerSink !== null) {
            perLoggerSink.write(line)
          }
        } else if (activeFileSink) {
          activeFileSink.write(line)
        }

        if (patterns && matchesAny(name, patterns)) {
          writeStdout(line)
        }
      }
    },

    isEnabled(name: string): boolean {
      init()
      return patterns !== null && matchesAny(name, patterns)
    },
  }
}

/** Default service instance used by the module-level convenience exports. */
const defaultService = createLoggingService()

/**
 * Activate file logging for this command. See {@link LoggingService.enableFileLogs}.
 */
export const enableFileLogs: LoggingService['enableFileLogs'] =
  defaultService.enableFileLogs.bind(defaultService)

/**
 * Create a named logger function. See {@link LoggingService.createLogger}.
 */
export const createLogger: LoggingService['createLogger'] =
  defaultService.createLogger.bind(defaultService)

/**
 * Check whether a logger name would produce stdout output under the current DEBUG value.
 */
export const isEnabled: LoggingService['isEnabled'] =
  defaultService.isEnabled.bind(defaultService)

/**
 * Minimal debug logging framework.
 *
 * When the DEBUG environment variable is set, matching loggers write
 * timestamped lines to `<cwd>/log/dust/<scope>.log`.
 *
 * The scope defaults to "debug" but can be changed via setLogScope()
 * so that different commands (e.g. `loop`, `check`, `bucket`) write
 * to separate log files.
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
import { type WriteFn, writeToFile } from './sink'

export { setLogScope } from './sink'

export type LogFn = (...messages: unknown[]) => void

let patterns: RegExp[] | null = null
let initialized = false

function init(): void {
  if (initialized) return
  initialized = true
  const parsed = parsePatterns(process.env.DEBUG)
  patterns = parsed.length > 0 ? parsed : null
}

/**
 * Create a named logger function. The returned function writes to
 * `log/dust/<scope>.log` when the logger name matches the DEBUG patterns.
 *
 * @param name - Logger name, e.g. `dust.bucket.loop`
 * @param write - Override the default file writer (for testing)
 */
export function createLogger(
  name: string,
  write: WriteFn = writeToFile
): LogFn {
  return (...messages: unknown[]) => {
    init()
    if (!patterns || !matchesAny(name, patterns)) return
    write(formatLine(name, messages))
  }
}

/**
 * Check whether a logger name would be enabled under the current DEBUG value.
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
}

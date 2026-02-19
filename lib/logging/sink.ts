/**
 * File-based log sink — the imperative shell for debug logging.
 *
 * Lazily creates `<cwd>/log/dust/<scope>.log` and appends lines to it.
 * The scope defaults to "debug" but can be changed via setLogScope()
 * so that different commands write to separate log files.
 */

import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export interface LogSink {
  write(line: string): void
}

type AppendFileSyncFn = (path: string, data: string) => void
type MkdirSyncFn = (path: string, options: { recursive: boolean }) => void

export class FileSink implements LogSink {
  private logPath: string | undefined
  private ready = false
  private scope: string

  constructor(
    private readonly _appendFileSync: AppendFileSyncFn,
    private readonly _mkdirSync: MkdirSyncFn,
  ) {
    this.scope = process.env.DEBUG_LOG_SCOPE || 'debug'
  }

  /**
   * Set the log scope, which determines the output filename.
   * Must be called before any logger writes (i.e. at command startup).
   *
   * For example, `setScope('loop')` writes to `log/dust/loop.log`.
   */
  setScope(name: string): void {
    this.scope = name
    process.env.DEBUG_LOG_SCOPE = name
    // Reset so the next write picks up the new filename
    this.logPath = undefined
    this.ready = false
  }

  private ensureLogFile(): string | undefined {
    if (this.ready) return this.logPath
    this.ready = true

    const dir = join(process.cwd(), 'log', 'dust')
    this.logPath = join(dir, `${this.scope}.log`)
    try {
      this._mkdirSync(dir, { recursive: true })
    } catch {
      this.logPath = undefined
    }
    return this.logPath
  }

  /**
   * Write a line to the debug log file.
   * Silently no-ops if the file cannot be opened.
   */
  write(line: string): void {
    const path = this.ensureLogFile()
    if (!path) return
    try {
      this._appendFileSync(path, line)
    } catch {
      // Best-effort — never crash the caller
    }
  }
}

export const defaultSink = new FileSink(appendFileSync, mkdirSync)

/**
 * Set the log scope on the default sink, which determines the output filename.
 * Must be called before any logger writes (i.e. at command startup).
 *
 * For example, `setLogScope('loop')` writes to `log/dust/loop.log`.
 */
export function setLogScope(name: string): void {
  defaultSink.setScope(name)
}

/**
 * File-based log sink — the imperative shell for debug logging.
 *
 * Lazily creates `~/.dust/logs/<scope>.log` and appends lines to it.
 * The scope is set at construction time via enableFileLogs() in index.ts.
 */

import { appendFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface LogSink {
  write(line: string): void
}

type AppendFileSyncFn = (path: string, data: string) => void
type MkdirSyncFn = (path: string, options: { recursive: boolean }) => void

export class FileSink implements LogSink {
  private logPath: string | undefined
  private ready = false

  constructor(
    private readonly scope: string,
    private readonly homeDir: string = homedir(),
    private readonly _appendFileSync: AppendFileSyncFn = appendFileSync,
    private readonly _mkdirSync: MkdirSyncFn = mkdirSync
  ) {}

  private ensureLogFile(): string | undefined {
    if (this.ready) return this.logPath
    this.ready = true

    const dir = join(this.homeDir, '.dust', 'logs')
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

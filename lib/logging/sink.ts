/**
 * File-based log sink — the imperative shell for debug logging.
 *
 * Writes log lines to an arbitrary file path, creating the directory lazily
 * on first write. The path is determined by the caller (enableFileLogs in
 * index.ts) rather than this class.
 */

import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export interface LogSink {
  write(line: string): void
}

type AppendFileSyncFn = (path: string, data: string) => void
type MkdirSyncFn = (path: string, options: { recursive: boolean }) => void

export class FileSink implements LogSink {
  private resolvedPath: string | undefined
  private ready = false

  constructor(
    private readonly logPath: string,
    private readonly _appendFileSync: AppendFileSyncFn = appendFileSync,
    private readonly _mkdirSync: MkdirSyncFn = mkdirSync
  ) {}

  private ensureLogFile(): string | undefined {
    if (this.ready) return this.resolvedPath
    this.ready = true

    this.resolvedPath = this.logPath
    try {
      this._mkdirSync(dirname(this.logPath), { recursive: true })
    } catch {
      this.resolvedPath = undefined
    }
    return this.resolvedPath
  }

  /**
   * Write a line to the log file.
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

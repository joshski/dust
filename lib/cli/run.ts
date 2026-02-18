/**
 * Entry point for bundled CLI builds (Node.js target)
 *
 * This is the minimal shell that passes real Node.js APIs to the wiring logic.
 * All testable logic is in wire.ts.
 */
import { existsSync, statSync } from 'node:fs'
import { chmod, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { wireEntry } from './wire'

await wireEntry(
  { existsSync, statSync, readFile, writeFile, mkdir, readdir, chmod },
  {
    argv: process.argv,
    cwd: () => process.cwd(),
    exit: (code: number) => {
      process.exitCode = code
    },
  },
  { log: console.log, error: console.error }
)

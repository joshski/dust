/**
 * Entry point for bundled CLI builds (Node.js target)
 *
 * This is the minimal shell that passes real Node.js APIs to the wiring logic.
 * All testable logic is in entry-wiring.ts.
 */
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { wireEntry } from './entry-wiring'

await wireEntry(
  { existsSync, readFile, writeFile, mkdir, readdir },
  { argv: process.argv, cwd: () => process.cwd(), exit: process.exit },
  { log: console.log, error: console.error }
)

/**
 * Entry point for bundled CLI builds (Node.js target)
 *
 * This is the minimal shell that passes real Node.js APIs to the wiring logic.
 * All testable logic is in wire.ts.
 */
import { existsSync, statSync, writeSync } from 'node:fs'
import {
  chmod,
  mkdir,
  readdir,
  readFile,
  rename,
  writeFile,
} from 'node:fs/promises'
import { type CommandEventMessage, createEventEmitter } from '../command-events'
import { wireEntry } from './wire'

// Create emitEvent function if DUST_EVENTS_FD is set
const eventsFd = process.env.DUST_EVENTS_FD
  ? Number.parseInt(process.env.DUST_EVENTS_FD, 10)
  : undefined
const emitEvent =
  eventsFd !== undefined && !Number.isNaN(eventsFd)
    ? createEventEmitter((message: CommandEventMessage) => {
        writeSync(eventsFd, `${JSON.stringify(message)}\n`)
      })
    : undefined

await wireEntry(
  { existsSync, statSync, readFile, writeFile, mkdir, readdir, chmod, rename },
  {
    argv: process.argv,
    cwd: () => process.cwd(),
    exit: (code: number) => {
      process.exitCode = code
    },
  },
  {
    log: console.log,
    write: (message: string) => {
      process.stdout.write(message)
    },
    error: console.error,
    emitEvent,
  }
)

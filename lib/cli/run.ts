/**
 * Entry point for bundled CLI builds (Node.js target)
 *
 * This is the minimal shell that passes real Node.js APIs to the wiring logic.
 * All testable logic is in wire.ts.
 */
import { type CommandEventMessage, createEventEmitter } from '../command-events'
import { createCommandEventWriter } from '../command-events-transport'
import { readEnvConfig } from '../env-config'
import { defaultFileSystemPrimitives, wireEntry } from './wire'

// Read environment configuration once at startup (imperative shell)
const envConfig = readEnvConfig(process.env)

const writeEvent = createCommandEventWriter(process.env, {
  fetch: (input, init) => fetch(input, init),
  onError: message => {
    console.error(message)
  },
})
const emitEvent = writeEvent
  ? createEventEmitter((message: CommandEventMessage) => {
      writeEvent(message)
    })
  : undefined

await wireEntry(
  defaultFileSystemPrimitives,
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
  },
  envConfig.runtime
)

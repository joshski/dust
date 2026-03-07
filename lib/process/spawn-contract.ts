import type { Readable } from 'node:stream'

export interface ProcessStderr {
  on(event: string, listener: (...values: any[]) => void): void
}

export interface ProcessForEvents {
  stdout: Readable | null
  stderr?: ProcessStderr | null
  killed: boolean
  kill(): boolean
  on(event: string, listener: (...values: any[]) => void): void
}

export type SpawnForEvents = (
  command: string,
  arguments_: string[],
  options: {
    cwd?: string
    env?: NodeJS.ProcessEnv
    stdio: ['ignore', 'pipe', 'pipe']
  }
) => ProcessForEvents

export interface ReadlineForEvents extends AsyncIterable<string> {
  close?(): void
}

export type CreateReadlineForEvents = (options: {
  input: Readable
}) => ReadlineForEvents

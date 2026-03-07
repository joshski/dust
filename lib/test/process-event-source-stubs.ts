import { PassThrough } from 'node:stream'
import type {
  CreateReadlineForEvents,
  ProcessForEvents,
  SpawnForEvents,
} from '../process/spawn-contract'

type EventListener = (...values: unknown[]) => void

interface ProcessEventSourceStubOptions {
  lines: string[]
  exitCode?: number | null
  errorToThrow?: Error
  stderrData?: string
}

export function createReadlineStub(lines: string[]): CreateReadlineForEvents {
  return () => ({
    async *[Symbol.asyncIterator]() {
      for (const line of lines) {
        yield line
      }
    },
  })
}

function createProcessStub(
  options: Omit<ProcessEventSourceStubOptions, 'lines'>
): ProcessForEvents {
  const { exitCode = 0, errorToThrow, stderrData } = options
  const closeListeners: EventListener[] = []

  const processStub: ProcessForEvents = {
    stdout: new PassThrough(),
    stderr: {
      on(event, listener) {
        if (event === 'data') {
          if (stderrData) {
            setTimeout(() => listener(Buffer.from(stderrData)), 0)
          }
        }
        return this
      },
    },
    killed: false,
    kill() {
      this.killed = true
      for (const listener of closeListeners) {
        listener(0)
      }
      return true
    },
    on(event, listener) {
      if (event === 'close') {
        closeListeners.push(listener)
        if (!errorToThrow) {
          setTimeout(() => listener(exitCode), 10)
        }
      } else {
        if (errorToThrow) {
          setTimeout(() => listener(errorToThrow), 0)
        }
      }
      return this
    },
  }

  return processStub
}

export function createSpawnStub(
  implementation: (
    command: string,
    arguments_: string[],
    options: {
      cwd?: string
      env?: NodeJS.ProcessEnv
      stdio: ['ignore', 'pipe', 'pipe']
    }
  ) => {
    stdout: ProcessForEvents['stdout']
    on: ProcessForEvents['on']
    stderr?: ProcessForEvents['stderr']
    killed?: boolean
    kill?: ProcessForEvents['kill']
  }
): SpawnForEvents {
  return (command, arguments_, options) => {
    const processStub = implementation(command, arguments_, options)
    const wrappedProcessStub: ProcessForEvents = {
      stdout: processStub.stdout,
      on: processStub.on,
      stderr: processStub.stderr,
      killed: processStub.killed ?? false,
      kill:
        processStub.kill ??
        function defaultKill(this: ProcessForEvents) {
          this.killed = true
          return true
        },
    }
    return wrappedProcessStub
  }
}

export function createProcessEventSourceDependencies(
  options: ProcessEventSourceStubOptions
): {
  spawn: SpawnForEvents
  createInterface: CreateReadlineForEvents
} {
  return {
    spawn: createSpawnStub(() =>
      createProcessStub({
        exitCode: options.exitCode,
        errorToThrow: options.errorToThrow,
        stderrData: options.stderrData,
      })
    ),
    createInterface: createReadlineStub(options.lines),
  }
}

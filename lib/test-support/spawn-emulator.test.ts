import { describe, expect, test } from 'vitest'
import { createSpawnEmulator } from './test-utilities'

describe('createSpawnEmulator', () => {
  describe('manual control mode', () => {
    test('creates spawn function that returns ChildProcess stub', () => {
      const { spawn } = createSpawnEmulator()
      const proc = spawn('git', ['status'])

      expect(proc).toBeDefined()
      expect(typeof proc.on).toBe('function')
      expect(proc.stdout).toBeDefined()
      expect(proc.stderr).toBeDefined()
    })

    test('tracks spawned processes', () => {
      const { spawn, getSpawnedProcesses } = createSpawnEmulator()

      spawn('git', ['pull'])
      spawn('docker', ['build', '.'])

      const processes = getSpawnedProcesses()
      expect(processes).toHaveLength(2)
      expect(processes[0].command).toBe('git')
      expect(processes[0].arguments).toEqual(['pull'])
      expect(processes[1].command).toBe('docker')
      expect(processes[1].arguments).toEqual(['build', '.'])
    })

    test('getLastProcess returns most recent process', () => {
      const { spawn, getLastProcess, getSpawnedProcesses } =
        createSpawnEmulator()

      spawn('git', ['pull'])
      spawn('docker', ['build', '.'])

      const lastProc = getLastProcess()
      expect(lastProc).toBeDefined()
      const processes = getSpawnedProcesses()
      expect(lastProc).toBe(processes[1].stub)
    })

    test('getLastProcess returns undefined when no processes spawned', () => {
      const { getLastProcess } = createSpawnEmulator()
      expect(getLastProcess()).toBeUndefined()
    })

    test('manually emit stdout data', () => {
      const { spawn, getLastProcess } = createSpawnEmulator()
      const proc = spawn('echo', ['hello'])
      const stub = getLastProcess()!

      const chunks: Buffer[] = []
      proc.stdout?.on('data', (data: Buffer) => chunks.push(data))

      stub.emitStdout('hello world')

      expect(chunks).toHaveLength(1)
      expect(chunks[0].toString()).toBe('hello world')
    })

    test('manually emit stderr data', () => {
      const { spawn, getLastProcess } = createSpawnEmulator()
      const proc = spawn('git', ['pull'])
      const stub = getLastProcess()!

      const chunks: Buffer[] = []
      proc.stderr!.on('data', (data: Buffer) => chunks.push(data))

      stub.emitStderr('fatal: merge conflict')

      expect(chunks).toHaveLength(1)
      expect(chunks[0].toString()).toBe('fatal: merge conflict')
    })

    test('manually emit close event with exit code', async () => {
      const { spawn, getLastProcess } = createSpawnEmulator()
      const proc = spawn('git', ['pull'])
      const stub = getLastProcess()!

      const closePromise = new Promise<number>(resolve => {
        proc.on('close', (code: number) => resolve(code))
      })

      stub.emitClose(1)

      const exitCode = await closePromise
      expect(exitCode).toBe(1)
    })

    test('manually emit error event', async () => {
      const { spawn, getLastProcess } = createSpawnEmulator()
      const proc = spawn('git', ['pull'])
      const stub = getLastProcess()!

      const errorPromise = new Promise<Error>(resolve => {
        proc.on('error', (error: Error) => resolve(error))
      })

      const testError = new Error('spawn ENOENT')
      stub.emitError(testError)

      const error = await errorPromise
      expect(error).toBe(testError)
      expect(error.message).toBe('spawn ENOENT')
    })

    test('allows full control over event timing', async () => {
      const { spawn, getLastProcess } = createSpawnEmulator()
      const proc = spawn('git', ['pull'])
      const stub = getLastProcess()!

      const events: string[] = []
      proc.stderr!.on('data', () => events.push('stderr'))
      proc.on('close', () => events.push('close'))

      // Control exact order of events
      stub.emitStderr('error line 1')
      stub.emitStderr('error line 2')
      stub.emitClose(1)

      // Wait for events to fire
      await new Promise(resolve => setImmediate(resolve))

      expect(events).toEqual(['stderr', 'stderr', 'close'])
    })
  })

  describe('auto-resolve mode', () => {
    test('automatically resolves with default exit code', async () => {
      const { spawn } = createSpawnEmulator({ autoResolve: true })
      const proc = spawn('git', ['status'])

      const exitCode = await new Promise<number>(resolve => {
        proc.on('close', (code: number) => resolve(code))
      })

      expect(exitCode).toBe(0)
    })

    test('uses custom default exit code', async () => {
      const { spawn } = createSpawnEmulator({
        autoResolve: true,
        defaultExitCode: 1,
      })
      const proc = spawn('failing-command')

      const exitCode = await new Promise<number>(resolve => {
        proc.on('close', (code: number) => resolve(code))
      })

      expect(exitCode).toBe(1)
    })

    test('uses command-specific exit code', async () => {
      const { spawn } = createSpawnEmulator({
        autoResolve: true,
        commands: {
          git: { exitCode: 128 },
        },
      })
      const proc = spawn('git', ['pull'])

      const exitCode = await new Promise<number>(resolve => {
        proc.on('close', (code: number) => resolve(code))
      })

      expect(exitCode).toBe(128)
    })

    test('emits stdout data before close', async () => {
      const { spawn } = createSpawnEmulator({
        autoResolve: true,
        commands: {
          git: { exitCode: 0, stdout: 'Already up to date.' },
        },
      })
      const proc = spawn('git', ['pull'])

      const events: string[] = []
      const stdoutChunks: string[] = []

      proc.stdout?.on('data', (data: Buffer) => {
        events.push('stdout')
        stdoutChunks.push(data.toString())
      })
      proc.on('close', () => events.push('close'))

      await new Promise<void>(resolve => {
        proc.on('close', () => resolve())
      })

      expect(events).toEqual(['stdout', 'close'])
      expect(stdoutChunks).toEqual(['Already up to date.'])
    })

    test('emits stderr data before close', async () => {
      const { spawn } = createSpawnEmulator({
        autoResolve: true,
        commands: {
          git: { exitCode: 1, stderr: 'fatal: not a git repository' },
        },
      })
      const proc = spawn('git', ['status'])

      const events: string[] = []
      const stderrChunks: string[] = []

      proc.stderr!.on('data', (data: Buffer) => {
        events.push('stderr')
        stderrChunks.push(data.toString())
      })
      proc.on('close', () => events.push('close'))

      await new Promise<void>(resolve => {
        proc.on('close', () => resolve())
      })

      expect(events).toEqual(['stderr', 'close'])
      expect(stderrChunks).toEqual(['fatal: not a git repository'])
    })

    test('emits both stdout and stderr before close', async () => {
      const { spawn } = createSpawnEmulator({
        autoResolve: true,
        commands: {
          script: {
            exitCode: 0,
            stdout: 'output message',
            stderr: 'warning message',
          },
        },
      })
      const proc = spawn('script')

      const events: string[] = []

      proc.stdout?.on('data', () => events.push('stdout'))
      proc.stderr!.on('data', () => events.push('stderr'))
      proc.on('close', () => events.push('close'))

      await new Promise<void>(resolve => {
        proc.on('close', () => resolve())
      })

      expect(events).toEqual(['stdout', 'stderr', 'close'])
    })

    test('emits error event instead of close when error configured', async () => {
      const testError = new Error('spawn ENOENT')
      const { spawn } = createSpawnEmulator({
        autoResolve: true,
        commands: {
          missing: { error: testError },
        },
      })
      const proc = spawn('missing')

      const events: string[] = []
      let capturedError: Error | undefined

      proc.on('error', (error: Error) => {
        events.push('error')
        capturedError = error
      })
      proc.on('close', () => events.push('close'))

      await new Promise<void>(resolve => {
        proc.on('error', () => resolve())
      })

      expect(events).toEqual(['error'])
      expect(capturedError).toBe(testError)
    })

    test('matches command with first argument for pattern matching', async () => {
      const { spawn } = createSpawnEmulator({
        autoResolve: true,
        commands: {
          'docker build': { exitCode: 1, stderr: 'Build failed' },
        },
      })
      const proc = spawn('docker', ['build', '-t', 'myimage', '.'])

      const stderrChunks: string[] = []
      proc.stderr!.on('data', (data: Buffer) => {
        stderrChunks.push(data.toString())
      })

      const exitCode = await new Promise<number>(resolve => {
        proc.on('close', (code: number) => resolve(code))
      })

      expect(exitCode).toBe(1)
      expect(stderrChunks).toEqual(['Build failed'])
    })

    test('falls back to command-only match when full pattern does not match', async () => {
      const { spawn } = createSpawnEmulator({
        autoResolve: true,
        commands: {
          git: { exitCode: 128 },
        },
      })
      const proc = spawn('git', ['unknown-subcommand'])

      const exitCode = await new Promise<number>(resolve => {
        proc.on('close', (code: number) => resolve(code))
      })

      expect(exitCode).toBe(128)
    })

    test('uses default exit code when no command config matches', async () => {
      const { spawn } = createSpawnEmulator({
        autoResolve: true,
        defaultExitCode: 0,
        commands: {
          git: { exitCode: 1 },
        },
      })
      const proc = spawn('docker', ['ps'])

      const exitCode = await new Promise<number>(resolve => {
        proc.on('close', (code: number) => resolve(code))
      })

      expect(exitCode).toBe(0)
    })
  })

  describe('process tracking with auto-resolve', () => {
    test('tracks processes in auto-resolve mode', () => {
      const { spawn, getSpawnedProcesses } = createSpawnEmulator({
        autoResolve: true,
      })

      spawn('git', ['pull'])
      spawn('docker', ['build', '.'])

      const processes = getSpawnedProcesses()
      expect(processes).toHaveLength(2)
      expect(processes[0].command).toBe('git')
      expect(processes[1].command).toBe('docker')
    })

    test('getLastProcess works in auto-resolve mode', () => {
      const { spawn, getLastProcess, getSpawnedProcesses } =
        createSpawnEmulator({
          autoResolve: true,
        })

      spawn('git', ['pull'])
      spawn('docker', ['build', '.'])

      const lastProc = getLastProcess()
      const processes = getSpawnedProcesses()
      expect(lastProc).toBe(processes[1].stub)
    })
  })

  describe('mixed usage', () => {
    test('can manually control processes even in auto-resolve mode', async () => {
      const { spawn, getLastProcess } = createSpawnEmulator({
        autoResolve: true,
      })

      // Auto-resolve will trigger, but we can still access stub for assertions
      const proc = spawn('git', ['pull'])
      const stub = getLastProcess()!

      // Wait for auto-resolve to complete
      await new Promise<void>(resolve => {
        proc.on('close', () => resolve())
      })

      // We can still access the stub for assertions
      expect(stub.process).toBe(proc)
      expect(stub.emitStdout).toBeDefined()
      expect(stub.emitStderr).toBeDefined()
      expect(stub.emitClose).toBeDefined()
      expect(stub.emitError).toBeDefined()
    })
  })
})

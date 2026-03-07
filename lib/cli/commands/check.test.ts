import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { describe, expect, test } from 'vitest'
import {
  asChildProcessStub,
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
} from '../../test/test-utilities'
import { createShellRunner, type ShellRunner } from '../process-runner'
import type {
  CommandContext,
  CommandDependencies,
  DustSettings,
} from '../types'
import {
  check,
  createOrderedFlushState,
  flushCompletedInDisplayOrder,
  truncateOutput,
} from './check'

function createMockBufferedRunner(
  results: Record<
    string,
    { exitCode: number; output: string; timedOut?: boolean }
  >
): ShellRunner & {
  calls: Array<{
    command: string
    cwd: string
    startTime: number
    timeoutMs?: number
  }>
} {
  const calls: Array<{
    command: string
    cwd: string
    startTime: number
    timeoutMs?: number
  }> = []
  return {
    run: async (command, cwd, timeoutMs) => {
      const startTime = Date.now()
      calls.push({ command, cwd, startTime, timeoutMs })
      return results[command] ?? { exitCode: 0, output: '' }
    },
    calls,
  }
}

function createDependencies(
  context: CommandContext,
  fileSystem: FileSystemEmulator,
  settings: DustSettings,
  commandArguments: string[] = []
): CommandDependencies {
  return {
    arguments: commandArguments,
    context,
    fileSystem,
    globScanner: fileSystem,
    settings,
  }
}

describe('check command with checks configuration', () => {
  test('runs configured checks in parallel', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'lint', command: 'npm run lint' },
        { name: 'test', command: 'npm test' },
        { name: 'build', command: 'npm run build' },
      ],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
      'npm test': { exitCode: 0, output: '' },
      'npm run build': { exitCode: 0, output: '' },
    })

    const result = await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(result.exitCode).toBe(0)
    expect(bufferedRunner.calls).toHaveLength(3)
    // Verify all commands were called (order may vary due to parallel execution)
    const commands = bufferedRunner.calls.map(c => c.command)
    expect(commands).toHaveLength(3)
    expect(new Set(commands)).toEqual(
      new Set(['npm run lint', 'npm test', 'npm run build'])
    )
  })

  test('displays pass status for each check', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'lint', command: 'npm run lint' },
        { name: 'test', command: 'npm test' },
      ],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
      'npm test': { exitCode: 0, output: '' },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(context.stdoutLines).toEqual([
      '✓ lint',
      '✓ test',
      '',
      '✓ 2/2 checks passed',
    ])
  })

  test('displays failure status and output for failing checks', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'lint', command: 'npm run lint' },
        { name: 'test', command: 'npm test' },
      ],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
      'npm test': { exitCode: 1, output: 'Test failed: expected 1 to equal 2' },
    })

    const result = await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(result.exitCode).toBe(1)
    expect(context.stdoutLines).toContain('✓ lint')
    expect(context.stdoutLines).toContain('✗ test')
    expect(context.stdoutLines).toContain('> npm test')
    expect(context.stdoutLines.join('\n')).toContain(
      'Test failed: expected 1 to equal 2'
    )
    expect(context.stdoutLines).toContain('✗ 1/2 checks passed')
  })

  test('suppresses output for passing checks', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'lint', command: 'npm run lint' }],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: 'All files passed linting!' },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    const output = context.stdoutLines.join('\n')
    expect(output).not.toContain('All files passed linting!')
    expect(output).not.toContain('> npm run lint')
  })

  test('shows command before output for failed checks', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'typecheck', command: 'bunx tsc --noEmit' }],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'bunx tsc --noEmit': {
        exitCode: 1,
        output: 'error TS2322: Type mismatch',
      },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    const output = context.stdoutLines.join('\n')
    const commandIndex = output.indexOf('> bunx tsc --noEmit')
    const outputIndex = output.indexOf('error TS2322')
    expect(commandIndex).toBeLessThan(outputIndex)
  })

  test('handles multiple failing checks', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'lint', command: 'npm run lint' },
        { name: 'test', command: 'npm test' },
        { name: 'build', command: 'npm run build' },
      ],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 1, output: 'Lint error' },
      'npm test': { exitCode: 0, output: '' },
      'npm run build': { exitCode: 1, output: 'Build failed' },
    })

    const result = await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(result.exitCode).toBe(1)
    expect(context.stdoutLines).toContain('✗ lint')
    expect(context.stdoutLines).toContain('✓ test')
    expect(context.stdoutLines).toContain('✗ build')
    expect(context.stdoutLines).toContain('✗ 1/3 checks passed')
    expect(context.stdoutLines.join('\n')).toContain('> npm run lint')
    expect(context.stdoutLines.join('\n')).toContain('> npm run build')
  })

  test('handles failed check with empty output', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'silent-fail', command: 'exit 1' }],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'exit 1': { exitCode: 1, output: '' },
    })

    const result = await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(result.exitCode).toBe(1)
    expect(context.stdoutLines).toContain('✗ silent-fail')
    expect(context.stdoutLines).toContain('> exit 1')
    expect(context.stdoutLines).toContain('✗ 0/1 checks passed')
  })

  test('displays hints for failed check when configured', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        {
          name: 'build',
          command: 'npm run build',
          hints: [
            'Run `npm install` if this is a fresh checkout',
            'Check for TypeScript errors in the files you modified',
          ],
        },
      ],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm run build': {
        exitCode: 1,
        output: 'error TS2307: Cannot find module',
      },
    })

    const result = await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(result.exitCode).toBe(1)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain("Hints for fixing 'build':")
    expect(output).toContain(
      '  - Run `npm install` if this is a fresh checkout'
    )
    expect(output).toContain(
      '  - Check for TypeScript errors in the files you modified'
    )
  })

  test('does not display hints when check passes', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        {
          name: 'build',
          command: 'npm run build',
          hints: ['This hint should not appear'],
        },
      ],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm run build': { exitCode: 0, output: '' },
    })

    const result = await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).not.toContain('Hints for fixing')
    expect(output).not.toContain('This hint should not appear')
  })

  test('does not display hints section when no hints configured', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'test', command: 'npm test' }],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm test': { exitCode: 1, output: 'Test failed' },
    })

    const result = await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(result.exitCode).toBe(1)
    const output = context.stdoutLines.join('\n')
    expect(output).not.toContain('Hints for fixing')
  })
})

describe('check command when no checks configured', () => {
  test('returns error when no checks configured', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = { dustCommand: 'npx dust' }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({})

    const result = await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('No checks configured')
    expect(bufferedRunner.calls).toHaveLength(0)
  })

  test('returns error when checks array is empty', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = { dustCommand: 'dust', checks: [] }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({})

    const result = await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('No checks configured')
  })

  test('shows helpful instructions when no checks configured', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = { dustCommand: 'dust' }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({})

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    const output = context.stderrLines.join('\n')
    expect(output).toContain('settings.json')
    expect(output).toContain('"checks"')
  })
})

function createMockChildProcess(options?: { pid?: number }) {
  const proc = new EventEmitter() as EventEmitter & {
    pid: number | undefined
    stdout: PassThrough
    stderr: PassThrough
    kill: () => void
    unref: () => void
  }
  proc.pid = options?.pid
  proc.stdout = new PassThrough()
  proc.stderr = new PassThrough()
  proc.kill = () => {}
  proc.unref = () => {}
  return proc
}

describe('createShellRunner', () => {
  test('captures stdout and stderr', async () => {
    const mockProc = createMockChildProcess()
    const mockSpawn = () => asChildProcessStub(mockProc)
    const runner = createShellRunner(mockSpawn)

    const promise = runner.run('cmd', '/')
    mockProc.stdout.emit('data', Buffer.from('stdout output\n'))
    mockProc.stderr.emit('data', Buffer.from('stderr output\n'))
    mockProc.emit('close', 0)

    const result = await promise
    expect(result.exitCode).toBe(0)
    expect(result.output).toBe('stdout output\nstderr output\n')
  })

  test('resolves with exit code from close event', async () => {
    const mockProc = createMockChildProcess()
    const mockSpawn = () => asChildProcessStub(mockProc)
    const runner = createShellRunner(mockSpawn)

    const promise = runner.run('cmd', '/')
    mockProc.emit('close', 42)

    const result = await promise
    expect(result.exitCode).toBe(42)
  })

  test('resolves with 1 when close event has null code', async () => {
    const mockProc = createMockChildProcess()
    const mockSpawn = () => asChildProcessStub(mockProc)
    const runner = createShellRunner(mockSpawn)

    const promise = runner.run('cmd', '/')
    mockProc.emit('close', null)

    const result = await promise
    expect(result.exitCode).toBe(1)
  })

  test('resolves with 1 on error', async () => {
    const mockProc = createMockChildProcess()
    const mockSpawn = () => asChildProcessStub(mockProc)
    const runner = createShellRunner(mockSpawn)

    const promise = runner.run('cmd', '/')
    mockProc.emit('error', new Error('spawn failed'))

    const result = await promise
    expect(result.exitCode).toBe(1)
    expect(result.output).toBe('spawn failed')
  })

  test('kills process and resolves with timedOut when timeout elapses', async () => {
    let killed = false
    const mockProc = createMockChildProcess()
    mockProc.kill = () => {
      killed = true
    }
    const mockSpawn = () => asChildProcessStub(mockProc)
    const runner = createShellRunner(mockSpawn)

    const promise = runner.run('cmd', '/', 50)
    mockProc.stdout.emit('data', Buffer.from('partial'))

    const result = await promise
    expect(result.timedOut).toBe(true)
    expect(result.exitCode).toBe(1)
    expect(result.output).toBe('partial')
    expect(killed).toBe(true)
  })

  test('ignores close event after timeout has already resolved', async () => {
    const mockProc = createMockChildProcess()
    const mockSpawn = () => asChildProcessStub(mockProc)
    const runner = createShellRunner(mockSpawn)

    const promise = runner.run('cmd', '/', 50)
    mockProc.stderr.emit('data', Buffer.from('stderr output'))

    const result = await promise
    expect(result.timedOut).toBe(true)
    expect(result.output).toBe('stderr output')

    // Close event after timeout should be ignored
    mockProc.emit('close', 0)
  })

  test('ignores error event after timeout has already resolved', async () => {
    const mockProc = createMockChildProcess()
    const mockSpawn = () => asChildProcessStub(mockProc)
    const runner = createShellRunner(mockSpawn)

    const promise = runner.run('cmd', '/', 50)

    const result = await promise
    expect(result.timedOut).toBe(true)

    // Error event after timeout should be ignored
    mockProc.emit('error', new Error('spawn failed'))
  })

  test('clears timeout timer on normal completion', async () => {
    const mockProc = createMockChildProcess()
    const mockSpawn = () => asChildProcessStub(mockProc)
    const runner = createShellRunner(mockSpawn)

    const promise = runner.run('cmd', '/', 5000)
    mockProc.stdout.emit('data', Buffer.from('output\n'))
    mockProc.emit('close', 0)

    const result = await promise
    expect(result.exitCode).toBe(0)
    expect(result.output).toBe('output\n')
    expect(result.timedOut).toBeUndefined()
  })

  test('handles null stdout and stderr gracefully', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: null
      stderr: null
    }
    mockProc.stdout = null
    mockProc.stderr = null
    const mockSpawn = () => asChildProcessStub(mockProc)
    const runner = createShellRunner(mockSpawn)

    const promise = runner.run('cmd', '/')
    mockProc.emit('close', 0)

    const result = await promise
    expect(result.exitCode).toBe(0)
    expect(result.output).toBe('')
  })
})

describe('check with validation', () => {
  test('runs validation in parallel with configured checks', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'biome', command: 'npm run lint' }],
    }
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': {} },
    })
    fileSystem.readFile = async () =>
      '# Test\n## Principles\n## Blocked By\n## Definition of Done'
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
    })

    const result = await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(result.exitCode).toBe(0)
    expect(bufferedRunner.calls).toHaveLength(1)
    // Validation is now shown as a check result
    expect(context.stdoutLines).toContain('✓ lint')
    expect(context.stdoutLines).toContain('✓ biome')
    expect(context.stdoutLines).toContain('✓ 2/2 checks passed')
  })

  test('fails overall if validation fails', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'biome', command: 'npm run lint' }],
    }
    // Include a task file with invalid filename (uppercase)
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'InvalidName.md':
              '# Test\n## Principles\n## Blocked By\n## Definition of Done',
          },
        },
      },
    })
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
    })

    const result = await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(result.exitCode).toBe(1)
    // Checks now run in parallel, so biome still runs
    expect(bufferedRunner.calls).toHaveLength(1)
    expect(context.stdoutLines).toContain('✗ lint')
    expect(context.stdoutLines).toContain('✓ biome')
    expect(context.stdoutLines).toContain('✗ 1/2 checks passed')
  })

  test('skips validation when .dust directory does not exist', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'biome', command: 'npm run lint' }],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
    })

    const result = await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(result.exitCode).toBe(0)
    expect(bufferedRunner.calls).toHaveLength(1)
    // No validation check in results when .dust doesn't exist
    expect(context.stdoutLines).not.toContain('✓ lint')
    expect(context.stdoutLines).toContain('✓ 1/1 checks passed')
  })
})

describe('check command timing display', () => {
  test('does not show timing for checks under 1 second', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'fast', command: 'fast-cmd' }],
    }
    const fileSystem = createFileSystemEmulator()
    // Mock runner that returns instantly (durationMs will be ~0)
    const bufferedRunner = createMockBufferedRunner({
      'fast-cmd': { exitCode: 0, output: '' },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    // The timing should not be shown for fast checks
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('✓ fast')
    expect(output).not.toMatch(/✓ fast \[\d/)
  })

  test('shows timing for checks at or over 1 second', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'slow', command: 'slow-cmd' }],
    }
    const fileSystem = createFileSystemEmulator()
    // Simulate 1.5 second elapsed time via injected clock
    let now = 1000
    const clock = () => now
    const slowRunner: ShellRunner = {
      run: async () => {
        now += 1500
        return { exitCode: 0, output: '' }
      },
    }

    await check(
      createDependencies(context, fileSystem, settings),
      slowRunner,
      clock
    )

    // The timing should be shown for slow checks
    const output = context.stdoutLines.join('\n')
    expect(output).toMatch(/✓ slow \[1\.5s\]/)
  })

  test('shows timing for failing slow checks', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'slow-fail', command: 'slow-fail-cmd' }],
    }
    const fileSystem = createFileSystemEmulator()
    // Simulate 1.2 second elapsed time via injected clock
    let now = 1000
    const clock = () => now
    const slowRunner: ShellRunner = {
      run: async () => {
        now += 1200
        return { exitCode: 1, output: 'Failed' }
      },
    }

    await check(
      createDependencies(context, fileSystem, settings),
      slowRunner,
      clock
    )

    // The timing should be shown for slow failing checks
    const output = context.stdoutLines.join('\n')
    expect(output).toMatch(/✗ slow-fail \[1\.2s\]/)
  })
})

describe('check command summary indicators', () => {
  test('shows ✓ indicator in summary when all checks pass', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'check1', command: 'cmd1' },
        { name: 'check2', command: 'cmd2' },
      ],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      cmd1: { exitCode: 0, output: '' },
      cmd2: { exitCode: 0, output: '' },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(context.stdoutLines).toContain('✓ 2/2 checks passed')
  })

  test('shows ✗ indicator in summary when any check fails', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'check1', command: 'cmd1' },
        { name: 'check2', command: 'cmd2' },
      ],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      cmd1: { exitCode: 0, output: '' },
      cmd2: { exitCode: 1, output: 'Error' },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(context.stdoutLines).toContain('✗ 1/2 checks passed')
  })
})

describe('check command timeout behavior', () => {
  test('passes default 13s timeout to runner', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'test', command: 'npm test' }],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm test': { exitCode: 0, output: '' },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(bufferedRunner.calls[0].timeoutMs).toBe(13000)
  })

  test('passes configured timeout to runner', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'test', command: 'npm test', timeoutMilliseconds: 30000 },
      ],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm test': { exitCode: 0, output: '' },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(bufferedRunner.calls[0].timeoutMs).toBe(30000)
  })

  test('displays timed out status line', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'slow-test', command: 'npm test' }],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm test': { exitCode: 1, output: 'partial output', timedOut: true },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(context.stdoutLines).toContain('✗ slow-test [timed out after 13s]')
  })

  test('displays timed out status with configured timeout', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'slow-test', command: 'npm test', timeoutMilliseconds: 30000 },
      ],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm test': { exitCode: 1, output: '', timedOut: true },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(context.stdoutLines).toContain('✗ slow-test [timed out after 30s]')
  })

  test('prints timeout notice and captured output for timed out check', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'slow-test', command: 'npm test' }],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm test': {
        exitCode: 1,
        output: 'partial output before timeout',
        timedOut: true,
      },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('> npm test')
    expect(output).toContain(
      'Note: This check was killed after 13s. To configure a different timeout, set "timeoutMilliseconds" in the check configuration in .dust/config/settings.json'
    )
    expect(output).toContain('partial output before timeout')
  })
})

describe('check command --serial flag', () => {
  test('runs configured checks sequentially with --serial flag', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'first', command: 'cmd1' },
        { name: 'second', command: 'cmd2' },
        { name: 'third', command: 'cmd3' },
      ],
    }
    const fileSystem = createFileSystemEmulator()

    // Track the order of command execution
    const executionOrder: string[] = []
    const runner: ShellRunner = {
      run: async command => {
        executionOrder.push(command)
        return { exitCode: 0, output: '' }
      },
    }

    const result = await check(
      createDependencies(context, fileSystem, settings, ['--serial']),
      runner
    )

    expect(result.exitCode).toBe(0)
    // In serial mode, commands should execute in the order they are defined
    expect(executionOrder).toEqual(['cmd1', 'cmd2', 'cmd3'])
  })

  test('runs lint first in serial mode when .dust exists', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'biome', command: 'npm run lint' }],
    }
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': {} },
    })
    fileSystem.readFile = async () =>
      '# Test\n## Principles\n## Blocked By\n## Definition of Done'
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
    })

    const result = await check(
      createDependencies(context, fileSystem, settings, ['--serial']),
      bufferedRunner
    )

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines[0]).toBe('✓ lint')
    expect(context.stdoutLines[1]).toBe('✓ biome')
  })

  test('output format is consistent between parallel and serial modes', async () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'lint', command: 'npm run lint' },
        { name: 'test', command: 'npm test' },
      ],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
      'npm test': { exitCode: 0, output: '' },
    })

    // Run in parallel mode
    const parallelContext = createContextEmulator()
    await check(
      createDependencies(parallelContext, fileSystem, settings),
      bufferedRunner
    )

    // Run in serial mode
    const serialContext = createContextEmulator()
    await check(
      createDependencies(serialContext, fileSystem, settings, ['--serial']),
      bufferedRunner
    )

    // Both should have the same output format (summary line)
    expect(parallelContext.stdoutLines).toContain('✓ 2/2 checks passed')
    expect(serialContext.stdoutLines).toContain('✓ 2/2 checks passed')
  })

  test('handles failures in serial mode', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'lint', command: 'npm run lint' },
        { name: 'test', command: 'npm test' },
      ],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
      'npm test': { exitCode: 1, output: 'Test failed' },
    })

    const result = await check(
      createDependencies(context, fileSystem, settings, ['--serial']),
      bufferedRunner
    )

    expect(result.exitCode).toBe(1)
    expect(context.stdoutLines).toContain('✓ lint')
    expect(context.stdoutLines).toContain('✗ test')
    expect(context.stdoutLines).toContain('✗ 1/2 checks passed')
  })

  test('default behavior (without --serial) runs checks in parallel', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'lint', command: 'npm run lint' },
        { name: 'test', command: 'npm test' },
        { name: 'build', command: 'npm run build' },
      ],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
      'npm test': { exitCode: 0, output: '' },
      'npm run build': { exitCode: 0, output: '' },
    })

    const result = await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(result.exitCode).toBe(0)
    expect(bufferedRunner.calls).toHaveLength(3)
    // Verify all commands were called (order may vary due to parallel execution)
    const commands = bufferedRunner.calls.map(c => c.command)
    expect(new Set(commands)).toEqual(
      new Set(['npm run lint', 'npm test', 'npm run build'])
    )
  })
})

describe('check command event emission', () => {
  test('emits check-started and check-passed for passing checks', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'lint', command: 'npm run lint' },
        { name: 'test', command: 'npm test' },
      ],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
      'npm test': { exitCode: 0, output: '' },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    // Check that events were emitted (order may vary due to parallel execution)
    const startedEvents = context.emittedEvents.filter(
      e => e.type === 'check-started'
    )
    const passedEvents = context.emittedEvents.filter(
      e => e.type === 'check-passed'
    )

    expect(startedEvents).toHaveLength(2)
    expect(passedEvents).toHaveLength(2)
    expect(startedEvents.map(e => e.name).sort()).toEqual(['lint', 'test'])
    expect(passedEvents.map(e => e.name).sort()).toEqual(['lint', 'test'])
  })

  test('emits check-started and check-failed for failing checks', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'test', command: 'npm test' }],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'npm test': { exitCode: 1, output: 'Test failed: expected 1 to equal 2' },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(context.emittedEvents).toContainEqual({
      type: 'check-started',
      name: 'test',
    })
    expect(context.emittedEvents).toContainEqual(
      expect.objectContaining({
        type: 'check-failed',
        name: 'test',
        output: 'Test failed: expected 1 to equal 2',
      })
    )
  })

  test('emits events for built-in lint check', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'biome', command: 'npm run lint' }],
    }
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': {} },
    })
    fileSystem.readFile = async () =>
      '# Test\n## Principles\n## Blocked By\n## Definition of Done'
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    // Should have events for both built-in lint and configured biome check
    const startedEvents = context.emittedEvents.filter(
      e => e.type === 'check-started'
    )
    expect(startedEvents.map(e => e.name).sort()).toEqual(['biome', 'lint'])
  })

  test('check-passed includes durationMs', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'fast', command: 'fast-cmd' }],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'fast-cmd': { exitCode: 0, output: '' },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    const passedEvent = context.emittedEvents.find(
      e => e.type === 'check-passed'
    )
    expect(passedEvent).toBeDefined()
    expect(passedEvent).toHaveProperty('durationMs')
    expect(typeof (passedEvent as { durationMs: number }).durationMs).toBe(
      'number'
    )
  })

  test('check-failed includes durationMs and optional output', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'failing', command: 'fail-cmd' }],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'fail-cmd': { exitCode: 1, output: 'Error message' },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    const failedEvent = context.emittedEvents.find(
      e => e.type === 'check-failed'
    )
    expect(failedEvent).toBeDefined()
    expect(failedEvent).toMatchObject({
      type: 'check-failed',
      name: 'failing',
      output: 'Error message',
    })
    expect(typeof (failedEvent as { durationMs: number }).durationMs).toBe(
      'number'
    )
  })

  test('check-failed omits output when empty', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'silent-fail', command: 'silent-cmd' }],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'silent-cmd': { exitCode: 1, output: '' },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    const failedEvent = context.emittedEvents.find(
      e => e.type === 'check-failed'
    )
    expect(failedEvent).toBeDefined()
    expect(failedEvent).toMatchObject({
      type: 'check-failed',
      name: 'silent-fail',
    })
    // Output should not be present when it's empty
    expect(failedEvent).not.toHaveProperty('output')
  })

  test('emits events in serial mode', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'first', command: 'cmd1' },
        { name: 'second', command: 'cmd2' },
      ],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      cmd1: { exitCode: 0, output: '' },
      cmd2: { exitCode: 1, output: 'failed' },
    })

    await check(
      createDependencies(context, fileSystem, settings, ['--serial']),
      bufferedRunner
    )

    // In serial mode, events should be in order
    const eventTypes = context.emittedEvents.map(e =>
      'name' in e ? `${e.type}:${e.name}` : e.type
    )
    expect(eventTypes).toEqual([
      'check-started:first',
      'check-passed:first',
      'check-started:second',
      'check-failed:second',
    ])
  })
})

describe('truncateOutput', () => {
  test('does not truncate output shorter than 500 lines', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`)
    const output = lines.join('\n')
    expect(truncateOutput(output)).toBe(output)
  })

  test('does not truncate output exactly 500 lines', () => {
    const lines = Array.from({ length: 500 }, (_, i) => `line ${i + 1}`)
    const output = lines.join('\n')
    expect(truncateOutput(output)).toBe(output)
  })

  test('truncates output of 501 lines with 1 line snipped', () => {
    const lines = Array.from({ length: 501 }, (_, i) => `line ${i + 1}`)
    const output = lines.join('\n')
    const result = truncateOutput(output)

    const resultLines = result.split('\n')
    expect(resultLines).toHaveLength(501) // 250 + 1 snip marker + 250
    expect(resultLines[0]).toBe('line 1')
    expect(resultLines[249]).toBe('line 250')
    expect(resultLines[250]).toBe('[...snip 1 lines...]')
    expect(resultLines[251]).toBe('line 252')
    expect(resultLines[500]).toBe('line 501')
  })

  test('truncates output of 1000 lines with marker', () => {
    const lines = Array.from({ length: 1000 }, (_, i) => `line ${i + 1}`)
    const output = lines.join('\n')
    const result = truncateOutput(output)

    const resultLines = result.split('\n')
    expect(resultLines).toHaveLength(501) // 250 + 1 snip marker + 250
    expect(resultLines[0]).toBe('line 1')
    expect(resultLines[249]).toBe('line 250')
    expect(resultLines[250]).toBe('[...snip 500 lines...]')
    expect(resultLines[251]).toBe('line 751')
    expect(resultLines[500]).toBe('line 1000')
  })
})

describe('flushCompletedInDisplayOrder', () => {
  test('holds later results until missing earlier index arrives', () => {
    let state = createOrderedFlushState<string>()

    const second = flushCompletedInDisplayOrder(state, 1, 'second')
    state = second.nextState
    expect(second.ready).toEqual([])

    const first = flushCompletedInDisplayOrder(state, 0, 'first')
    expect(first.ready).toEqual(['first', 'second'])
  })
})

describe('check command progressive ordered status output', () => {
  test('does not emit progress dots while checks are running', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'test', command: 'test-cmd' }],
    }
    const fileSystem = createFileSystemEmulator()
    const bufferedRunner = createMockBufferedRunner({
      'test-cmd': { exitCode: 0, output: '' },
    })

    await check(
      createDependencies(context, fileSystem, settings),
      bufferedRunner
    )

    expect(context.stdoutLines).not.toContain('.')
  })

  test('flushes parallel completion in deterministic display order', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'first', command: 'cmd1' },
        { name: 'second', command: 'cmd2' },
        { name: 'third', command: 'cmd3' },
      ],
    }
    const fileSystem = createFileSystemEmulator()

    let resolveCmd1:
      | ((value: { exitCode: number; output: string }) => void)
      | undefined
    let resolveCmd2:
      | ((value: { exitCode: number; output: string }) => void)
      | undefined
    let resolveCmd3:
      | ((value: { exitCode: number; output: string }) => void)
      | undefined

    const cmd1 = new Promise<{ exitCode: number; output: string }>(resolve => {
      resolveCmd1 = resolve
    })
    const cmd2 = new Promise<{ exitCode: number; output: string }>(resolve => {
      resolveCmd2 = resolve
    })
    const cmd3 = new Promise<{ exitCode: number; output: string }>(resolve => {
      resolveCmd3 = resolve
    })

    let runCallCount = 0
    const runner: ShellRunner = {
      run: async command => {
        runCallCount += 1
        if (command === 'cmd1') return cmd1
        if (command === 'cmd2') return cmd2
        if (command === 'cmd3') return cmd3
        return { exitCode: 0, output: '' }
      },
    }

    const checkPromise = check(
      createDependencies(context, fileSystem, settings),
      runner
    )
    expect(runCallCount).toBe(3)

    resolveCmd2?.({ exitCode: 0, output: '' })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(context.stdoutLines).toEqual([])

    resolveCmd1?.({ exitCode: 0, output: '' })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(context.stdoutLines).toEqual(['✓ first', '✓ second'])

    resolveCmd3?.({ exitCode: 0, output: '' })
    await checkPromise
    expect(context.stdoutLines).toEqual([
      '✓ first',
      '✓ second',
      '✓ third',
      '',
      '✓ 3/3 checks passed',
    ])
  })
})

import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { describe, expect, test, vi } from 'vitest'
import {
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
import { check } from './check'

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

function createMockChildProcess(options?: { kill?: () => void }) {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: PassThrough
    stderr: PassThrough
    kill: () => void
    unref: () => void
  }
  proc.stdout = new PassThrough()
  proc.stderr = new PassThrough()
  proc.kill = options?.kill ?? (() => {})
  proc.unref = () => {}
  return proc
}

describe('createShellRunner', () => {
  test('captures stdout and stderr', async () => {
    const mockProc = createMockChildProcess()

    const mockSpawn = () => mockProc as unknown as ChildProcess
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

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createShellRunner(mockSpawn)

    const promise = runner.run('cmd', '/')
    mockProc.emit('close', 42)

    const result = await promise
    expect(result.exitCode).toBe(42)
  })

  test('resolves with 1 when close event has null code', async () => {
    const mockProc = createMockChildProcess()

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createShellRunner(mockSpawn)

    const promise = runner.run('cmd', '/')
    mockProc.emit('close', null)

    const result = await promise
    expect(result.exitCode).toBe(1)
  })

  test('resolves with 1 on error', async () => {
    const mockProc = createMockChildProcess()

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createShellRunner(mockSpawn)

    const promise = runner.run('cmd', '/')
    mockProc.emit('error', new Error('spawn failed'))

    const result = await promise
    expect(result.exitCode).toBe(1)
    expect(result.output).toBe('spawn failed')
  })

  test('kills process and resolves with timedOut when timeout elapses', async () => {
    let killed = false
    const mockProc = createMockChildProcess({
      kill: () => {
        killed = true
      },
    })

    const mockSpawn = () => mockProc as unknown as ChildProcess
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

    const mockSpawn = () => mockProc as unknown as ChildProcess
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

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createShellRunner(mockSpawn)

    const promise = runner.run('cmd', '/', 50)

    const result = await promise
    expect(result.timedOut).toBe(true)

    // Error event after timeout should be ignored
    mockProc.emit('error', new Error('spawn failed'))
  })

  test('clears timeout timer on normal completion', async () => {
    const mockProc = createMockChildProcess()

    const mockSpawn = () => mockProc as unknown as ChildProcess
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

    const mockSpawn = () => mockProc as unknown as ChildProcess
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
      '# Test\n## Goals\n## Blocked By\n## Definition of Done'
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
              '# Test\n## Goals\n## Blocked By\n## Definition of Done',
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
    // Mock Date.now to simulate 1.5 second elapsed time
    let now = 1000
    const dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now)
    const slowRunner: ShellRunner = {
      run: async () => {
        now += 1500
        return { exitCode: 0, output: '' }
      },
    }

    await check(createDependencies(context, fileSystem, settings), slowRunner)

    // The timing should be shown for slow checks
    const output = context.stdoutLines.join('\n')
    expect(output).toMatch(/✓ slow \[1\.5s\]/)
    dateNowSpy.mockRestore()
  })

  test('shows timing for failing slow checks', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'slow-fail', command: 'slow-fail-cmd' }],
    }
    const fileSystem = createFileSystemEmulator()
    // Mock Date.now to simulate 1.2 second elapsed time
    let now = 1000
    const dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now)
    const slowRunner: ShellRunner = {
      run: async () => {
        now += 1200
        return { exitCode: 1, output: 'Failed' }
      },
    }

    await check(createDependencies(context, fileSystem, settings), slowRunner)

    // The timing should be shown for slow failing checks
    const output = context.stdoutLines.join('\n')
    expect(output).toMatch(/✗ slow-fail \[1\.2s\]/)
    dateNowSpy.mockRestore()
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
      '# Test\n## Goals\n## Blocked By\n## Definition of Done'
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
    })

    const result = await check(
      createDependencies(context, fileSystem, settings, ['--serial']),
      bufferedRunner
    )

    expect(result.exitCode).toBe(0)
    // Lint should appear first in results
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

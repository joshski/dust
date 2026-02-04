import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
} from '../../test/test-utilities'
import type {
  CommandContext,
  CommandDependencies,
  DustSettings,
} from '../types'
import {
  type BufferedProcessRunner,
  check,
  createBufferedRunner,
} from './check'

function createMockBufferedRunner(
  results: Record<string, { exitCode: number; output: string }>
): BufferedProcessRunner & {
  calls: Array<{ command: string; cwd: string; startTime: number }>
} {
  const calls: Array<{ command: string; cwd: string; startTime: number }> = []
  return {
    run: async (command, cwd) => {
      const startTime = Date.now()
      calls.push({ command, cwd, startTime })
      return results[command] ?? { exitCode: 0, output: '' }
    },
    calls,
  }
}

function createDependencies(
  context: CommandContext,
  fileSystem: FileSystemEmulator,
  settings: DustSettings
): CommandDependencies {
  return {
    arguments: [],
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
      '2/2 checks passed',
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
    expect(context.stdoutLines).toContain('1/2 checks passed')
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
    expect(context.stdoutLines).toContain('1/3 checks passed')
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
    expect(context.stdoutLines).toContain('0/1 checks passed')
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

describe('createBufferedRunner', () => {
  test('captures stdout and stderr', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter
      stderr: EventEmitter
    }
    mockProc.stdout = new EventEmitter()
    mockProc.stderr = new EventEmitter()

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createBufferedRunner(mockSpawn)

    const promise = runner.run('cmd', '/')
    mockProc.stdout.emit('data', Buffer.from('stdout output\n'))
    mockProc.stderr.emit('data', Buffer.from('stderr output\n'))
    mockProc.emit('close', 0)

    const result = await promise
    expect(result.exitCode).toBe(0)
    expect(result.output).toBe('stdout output\nstderr output\n')
  })

  test('resolves with exit code from close event', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter
      stderr: EventEmitter
    }
    mockProc.stdout = new EventEmitter()
    mockProc.stderr = new EventEmitter()

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createBufferedRunner(mockSpawn)

    const promise = runner.run('cmd', '/')
    mockProc.emit('close', 42)

    const result = await promise
    expect(result.exitCode).toBe(42)
  })

  test('resolves with 1 when close event has null code', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter
      stderr: EventEmitter
    }
    mockProc.stdout = new EventEmitter()
    mockProc.stderr = new EventEmitter()

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createBufferedRunner(mockSpawn)

    const promise = runner.run('cmd', '/')
    mockProc.emit('close', null)

    const result = await promise
    expect(result.exitCode).toBe(1)
  })

  test('resolves with 1 on error', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter
      stderr: EventEmitter
    }
    mockProc.stdout = new EventEmitter()
    mockProc.stderr = new EventEmitter()

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createBufferedRunner(mockSpawn)

    const promise = runner.run('cmd', '/')
    mockProc.emit('error', new Error('spawn failed'))

    const result = await promise
    expect(result.exitCode).toBe(1)
    expect(result.output).toBe('spawn failed')
  })

  test('handles null stdout and stderr gracefully', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: null
      stderr: null
    }
    mockProc.stdout = null
    mockProc.stderr = null

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createBufferedRunner(mockSpawn)

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
      checks: [{ name: 'lint', command: 'npm run lint' }],
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
    expect(context.stdoutLines).toContain('✓ lint markdown')
    expect(context.stdoutLines).toContain('✓ lint')
    expect(context.stdoutLines).toContain('2/2 checks passed')
  })

  test('fails overall if validation fails', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'lint', command: 'npm run lint' }],
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
    // Checks now run in parallel, so lint still runs
    expect(bufferedRunner.calls).toHaveLength(1)
    expect(context.stdoutLines).toContain('✗ lint markdown')
    expect(context.stdoutLines).toContain('✓ lint')
    expect(context.stdoutLines).toContain('1/2 checks passed')
  })

  test('skips validation when .dust directory does not exist', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'lint', command: 'npm run lint' }],
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
    expect(context.stdoutLines).not.toContain('✓ lint markdown')
    expect(context.stdoutLines).toContain('1/1 checks passed')
  })
})

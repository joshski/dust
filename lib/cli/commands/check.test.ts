import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import {
  createCommandDependencies,
  type FileSystemEmulator,
} from '../../test/test-utilities'
import type { DustSettings } from '../types'
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

describe('check command with checks configuration', () => {
  test('runs configured checks in parallel', async () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'lint', command: 'npm run lint' },
        { name: 'test', command: 'npm test' },
        { name: 'build', command: 'npm run build' },
      ],
    }
    const { dependencies } = createCommandDependencies({ settings })
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
      'npm test': { exitCode: 0, output: '' },
      'npm run build': { exitCode: 0, output: '' },
    })

    const result = await check(dependencies, bufferedRunner)

    expect(result.exitCode).toBe(0)
    expect(bufferedRunner.calls).toHaveLength(3)
    const commands = bufferedRunner.calls.map(c => c.command)
    expect(new Set(commands)).toEqual(
      new Set(['npm run lint', 'npm test', 'npm run build'])
    )
  })

  test('displays pass status for each check', async () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'lint', command: 'npm run lint' },
        { name: 'test', command: 'npm test' },
      ],
    }
    const { context, dependencies } = createCommandDependencies({ settings })
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
      'npm test': { exitCode: 0, output: '' },
    })

    await check(dependencies, bufferedRunner)

    expect(context.stdoutLines).toEqual([
      '✓ lint',
      '✓ test',
      '',
      '✓ 2/2 checks passed',
    ])
  })

  test('displays failure status and output for failing checks', async () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'lint', command: 'npm run lint' },
        { name: 'test', command: 'npm test' },
      ],
    }
    const { context, dependencies } = createCommandDependencies({ settings })
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
      'npm test': { exitCode: 1, output: 'Test failed: expected 1 to equal 2' },
    })

    const result = await check(dependencies, bufferedRunner)

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
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'lint', command: 'npm run lint' }],
    }
    const { context, dependencies } = createCommandDependencies({ settings })
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: 'All files passed linting!' },
    })

    await check(dependencies, bufferedRunner)

    const output = context.stdoutLines.join('\n')
    expect(output).not.toContain('All files passed linting!')
    expect(output).not.toContain('> npm run lint')
  })

  test('shows command before output for failed checks', async () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'typecheck', command: 'bunx tsc --noEmit' }],
    }
    const { context, dependencies } = createCommandDependencies({ settings })
    const bufferedRunner = createMockBufferedRunner({
      'bunx tsc --noEmit': {
        exitCode: 1,
        output: 'error TS2322: Type mismatch',
      },
    })

    await check(dependencies, bufferedRunner)

    const output = context.stdoutLines.join('\n')
    const commandIndex = output.indexOf('> bunx tsc --noEmit')
    const outputIndex = output.indexOf('error TS2322')
    expect(commandIndex).toBeLessThan(outputIndex)
  })

  test('handles multiple failing checks', async () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'lint', command: 'npm run lint' },
        { name: 'test', command: 'npm test' },
        { name: 'build', command: 'npm run build' },
      ],
    }
    const { context, dependencies } = createCommandDependencies({ settings })
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 1, output: 'Lint error' },
      'npm test': { exitCode: 0, output: '' },
      'npm run build': { exitCode: 1, output: 'Build failed' },
    })

    const result = await check(dependencies, bufferedRunner)

    expect(result.exitCode).toBe(1)
    expect(context.stdoutLines).toContain('✗ lint')
    expect(context.stdoutLines).toContain('✓ test')
    expect(context.stdoutLines).toContain('✗ build')
    expect(context.stdoutLines).toContain('✗ 1/3 checks passed')
    expect(context.stdoutLines.join('\n')).toContain('> npm run lint')
    expect(context.stdoutLines.join('\n')).toContain('> npm run build')
  })

  test('handles failed check with empty output', async () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'silent-fail', command: 'exit 1' }],
    }
    const { context, dependencies } = createCommandDependencies({ settings })
    const bufferedRunner = createMockBufferedRunner({
      'exit 1': { exitCode: 1, output: '' },
    })

    const result = await check(dependencies, bufferedRunner)

    expect(result.exitCode).toBe(1)
    expect(context.stdoutLines).toContain('✗ silent-fail')
    expect(context.stdoutLines).toContain('> exit 1')
    expect(context.stdoutLines).toContain('✗ 0/1 checks passed')
  })

  test('displays hints for failed check when configured', async () => {
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
    const { context, dependencies } = createCommandDependencies({ settings })
    const bufferedRunner = createMockBufferedRunner({
      'npm run build': {
        exitCode: 1,
        output: 'error TS2307: Cannot find module',
      },
    })

    const result = await check(dependencies, bufferedRunner)

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
    const { context, dependencies } = createCommandDependencies({ settings })
    const bufferedRunner = createMockBufferedRunner({
      'npm run build': { exitCode: 0, output: '' },
    })

    const result = await check(dependencies, bufferedRunner)

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).not.toContain('Hints for fixing')
    expect(output).not.toContain('This hint should not appear')
  })

  test('does not display hints section when no hints configured', async () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'test', command: 'npm test' }],
    }
    const { context, dependencies } = createCommandDependencies({ settings })
    const bufferedRunner = createMockBufferedRunner({
      'npm test': { exitCode: 1, output: 'Test failed' },
    })

    const result = await check(dependencies, bufferedRunner)

    expect(result.exitCode).toBe(1)
    const output = context.stdoutLines.join('\n')
    expect(output).not.toContain('Hints for fixing')
  })
})

describe('check command when no checks configured', () => {
  test('returns error when no checks configured', async () => {
    const { context, dependencies } = createCommandDependencies({
      settings: { dustCommand: 'npx dust' },
    })
    const bufferedRunner = createMockBufferedRunner({})

    const result = await check(dependencies, bufferedRunner)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('No checks configured')
    expect(bufferedRunner.calls).toHaveLength(0)
  })

  test('returns error when checks array is empty', async () => {
    const { context, dependencies } = createCommandDependencies({
      settings: { dustCommand: 'dust', checks: [] },
    })
    const bufferedRunner = createMockBufferedRunner({})

    const result = await check(dependencies, bufferedRunner)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('No checks configured')
  })

  test('shows helpful instructions when no checks configured', async () => {
    const { context, dependencies } = createCommandDependencies({
      settings: { dustCommand: 'dust' },
    })
    const bufferedRunner = createMockBufferedRunner({})

    await check(dependencies, bufferedRunner)

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
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'lint', command: 'npm run lint' }],
    }
    const { context, fileSystem, dependencies } = createCommandDependencies({
      settings,
      files: { project: { '.dust': {} } },
    })
    fileSystem.readFile = async () =>
      '# Test\n## Goals\n## Blocked By\n## Definition of Done'
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
    })

    const result = await check(dependencies, bufferedRunner)

    expect(result.exitCode).toBe(0)
    expect(bufferedRunner.calls).toHaveLength(1)
    expect(context.stdoutLines).toContain('✓ lint markdown')
    expect(context.stdoutLines).toContain('✓ lint')
    expect(context.stdoutLines).toContain('✓ 2/2 checks passed')
  })

  test('fails overall if validation fails', async () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'lint', command: 'npm run lint' }],
    }
    const { context, dependencies } = createCommandDependencies({
      settings,
      files: {
        project: {
          '.dust': {
            tasks: {
              'InvalidName.md':
                '# Test\n## Goals\n## Blocked By\n## Definition of Done',
            },
          },
        },
      },
    })
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
    })

    const result = await check(dependencies, bufferedRunner)

    expect(result.exitCode).toBe(1)
    expect(bufferedRunner.calls).toHaveLength(1)
    expect(context.stdoutLines).toContain('✗ lint markdown')
    expect(context.stdoutLines).toContain('✓ lint')
    expect(context.stdoutLines).toContain('✗ 1/2 checks passed')
  })

  test('skips validation when .dust directory does not exist', async () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'lint', command: 'npm run lint' }],
    }
    const { context, dependencies } = createCommandDependencies({ settings })
    const bufferedRunner = createMockBufferedRunner({
      'npm run lint': { exitCode: 0, output: '' },
    })

    const result = await check(dependencies, bufferedRunner)

    expect(result.exitCode).toBe(0)
    expect(bufferedRunner.calls).toHaveLength(1)
    expect(context.stdoutLines).not.toContain('✓ lint markdown')
    expect(context.stdoutLines).toContain('✓ 1/1 checks passed')
  })
})

describe('check command timing display', () => {
  test('does not show timing for checks under 1 second', async () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'fast', command: 'fast-cmd' }],
    }
    const { context, dependencies } = createCommandDependencies({ settings })
    const bufferedRunner = createMockBufferedRunner({
      'fast-cmd': { exitCode: 0, output: '' },
    })

    await check(dependencies, bufferedRunner)

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('✓ fast')
    expect(output).not.toMatch(/✓ fast \[\d/)
  })

  test('shows timing for checks at or over 1 second', async () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'slow', command: 'slow-cmd' }],
    }
    const { context, dependencies } = createCommandDependencies({ settings })
    const slowRunner: BufferedProcessRunner = {
      run: async () => {
        await new Promise(resolve => setTimeout(resolve, 1500))
        return { exitCode: 0, output: '' }
      },
    }

    await check(dependencies, slowRunner)

    const output = context.stdoutLines.join('\n')
    expect(output).toMatch(/✓ slow \[1\.\d+s\]/)
  })

  test('shows timing for failing slow checks', async () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'slow-fail', command: 'slow-fail-cmd' }],
    }
    const { context, dependencies } = createCommandDependencies({ settings })
    const slowRunner: BufferedProcessRunner = {
      run: async () => {
        await new Promise(resolve => setTimeout(resolve, 1200))
        return { exitCode: 1, output: 'Failed' }
      },
    }

    await check(dependencies, slowRunner)

    const output = context.stdoutLines.join('\n')
    expect(output).toMatch(/✗ slow-fail \[1\.\d+s\]/)
  })
})

describe('check command summary indicators', () => {
  test('shows ✓ indicator in summary when all checks pass', async () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'check1', command: 'cmd1' },
        { name: 'check2', command: 'cmd2' },
      ],
    }
    const { context, dependencies } = createCommandDependencies({ settings })
    const bufferedRunner = createMockBufferedRunner({
      cmd1: { exitCode: 0, output: '' },
      cmd2: { exitCode: 0, output: '' },
    })

    await check(dependencies, bufferedRunner)

    expect(context.stdoutLines).toContain('✓ 2/2 checks passed')
  })

  test('shows ✗ indicator in summary when any check fails', async () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'check1', command: 'cmd1' },
        { name: 'check2', command: 'cmd2' },
      ],
    }
    const { context, dependencies } = createCommandDependencies({ settings })
    const bufferedRunner = createMockBufferedRunner({
      cmd1: { exitCode: 0, output: '' },
      cmd2: { exitCode: 1, output: 'Error' },
    })

    await check(dependencies, bufferedRunner)

    expect(context.stdoutLines).toContain('✗ 1/2 checks passed')
  })
})

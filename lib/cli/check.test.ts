import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import { check, createProcessRunner, type ProcessRunner } from './check'
import type { CommandContext, FileSystem } from './types'
import type { GlobScanner } from './validate'

function createMockContext(): CommandContext & {
  stdoutLines: string[]
  stderrLines: string[]
} {
  const stdoutLines: string[] = []
  const stderrLines: string[] = []
  return {
    cwd: '/project',
    stdout: (msg: string) => stdoutLines.push(msg),
    stderr: (msg: string) => stderrLines.push(msg),
    stdoutLines,
    stderrLines,
  }
}

function createMockFs(existingPaths: Set<string> = new Set()): FileSystem {
  return {
    exists: (path: string) => existingPaths.has(path),
    readFile: async () => '',
    writeFile: async () => {},
    mkdir: async () => {},
    readdir: async () => [],
  }
}

function createMockRunner(exitCode: number): ProcessRunner & {
  calls: Array<{ command: string; args: string[]; cwd: string }>
} {
  const calls: Array<{ command: string; args: string[]; cwd: string }> = []
  return {
    spawn: async (command, args, options) => {
      calls.push({ command, args, cwd: options.cwd })
      return exitCode
    },
    calls,
  }
}

function createMockGlob(files: string[]): GlobScanner {
  return {
    scan: async function* () {
      for (const file of files) {
        yield file
      }
    },
  }
}

describe('check command', () => {
  test('executes hook and returns its exit code on success', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/.dust/hooks/check']))
    const runner = createMockRunner(0)

    const result = await check(ctx, fs, [], runner)

    expect(result.exitCode).toBe(0)
    expect(runner.calls).toHaveLength(1)
    expect(runner.calls[0].command).toBe('/project/.dust/hooks/check')
    expect(runner.calls[0].cwd).toBe('/project')
  })

  test('forwards non-zero exit code from hook', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/.dust/hooks/check']))
    const runner = createMockRunner(1)

    const result = await check(ctx, fs, [], runner)

    expect(result.exitCode).toBe(1)
  })

  test('returns error if hook does not exist', async () => {
    const ctx = createMockContext()
    const fs = createMockFs() // No hook file
    const runner = createMockRunner(0)

    const result = await check(ctx, fs, [], runner)

    expect(result.exitCode).toBe(1)
    expect(ctx.stderrLines.join('\n')).toContain('No check hook found')
    expect(ctx.stderrLines.join('\n')).toContain('.dust/hooks/check')
    expect(runner.calls).toHaveLength(0)
  })

  test('shows helpful instructions when hook is missing', async () => {
    const ctx = createMockContext()
    const fs = createMockFs()
    const runner = createMockRunner(0)

    await check(ctx, fs, [], runner)

    const output = ctx.stderrLines.join('\n')
    expect(output).toContain('mkdir -p .dust/hooks')
    expect(output).toContain('chmod +x')
  })
})

describe('createProcessRunner', () => {
  test('resolves with exit code from close event', async () => {
    const mockProc = new EventEmitter()
    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createProcessRunner(mockSpawn)

    const promise = runner.spawn('cmd', [], { cwd: '/', stdio: 'inherit' })
    mockProc.emit('close', 0)

    expect(await promise).toBe(0)
  })

  test('resolves with 1 when close event has null code', async () => {
    const mockProc = new EventEmitter()
    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createProcessRunner(mockSpawn)

    const promise = runner.spawn('cmd', [], { cwd: '/', stdio: 'inherit' })
    mockProc.emit('close', null)

    expect(await promise).toBe(1)
  })

  test('resolves with 1 on error event', async () => {
    const mockProc = new EventEmitter()
    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createProcessRunner(mockSpawn)

    const promise = runner.spawn('cmd', [], { cwd: '/', stdio: 'inherit' })
    mockProc.emit('error', new Error('spawn failed'))

    expect(await promise).toBe(1)
  })
})

describe('check with validation', () => {
  test('runs validation before hook when glob is provided', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(
      new Set(['/project/.dust', '/project/.dust/hooks/check'])
    )
    fs.readFile = async () =>
      '# Test\n## Goals\n## Blocked by\n## Definition of done'
    const runner = createMockRunner(0)
    const glob = createMockGlob([])

    const result = await check(ctx, fs, [], runner, glob)

    expect(result.exitCode).toBe(0)
    expect(runner.calls).toHaveLength(1)
    expect(ctx.stdoutLines).toContain('All validations passed!')
  })

  test('exits early if validation fails', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(
      new Set([
        '/project/.dust',
        '/project/.dust/tasks',
        '/project/.dust/hooks/check',
      ])
    )
    // Return a task file with invalid filename (uppercase)
    fs.readFile = async () =>
      '# Test\n## Goals\n## Blocked by\n## Definition of done'
    const runner = createMockRunner(0)
    const glob = createMockGlob(['InvalidName.md'])

    const result = await check(ctx, fs, [], runner, glob)

    expect(result.exitCode).toBe(1)
    expect(runner.calls).toHaveLength(0) // Hook should not run
    expect(ctx.stderrLines.join('\n')).toContain('violation')
  })

  test('skips validation when glob is not provided', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/.dust/hooks/check']))
    const runner = createMockRunner(0)

    const result = await check(ctx, fs, [], runner)

    expect(result.exitCode).toBe(0)
    expect(runner.calls).toHaveLength(1)
    expect(ctx.stdoutLines).not.toContain('All validations passed!')
  })
})

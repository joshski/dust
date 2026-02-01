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
import { agent, createInstallRunner, type InstallRunner } from './agent'

function createDependencies(
  context: CommandContext,
  commandArguments: string[],
  settings: DustSettings,
  fileSystemOverride?: FileSystemEmulator
): CommandDependencies {
  const fileSystem = fileSystemOverride || createFileSystemEmulator()
  return {
    arguments: commandArguments,
    context,
    fileSystem,
    globScanner: fileSystem,
    settings,
  }
}

function createMockInstallRunner(
  exitCode = 0,
  output = ''
): InstallRunner & { calls: Array<{ command: string; cwd: string }> } {
  const calls: Array<{ command: string; cwd: string }> = []
  return {
    calls,
    run: async (command: string, cwd: string) => {
      calls.push({ command, cwd })
      return { exitCode, output }
    },
  }
}

const defaultSettings: DustSettings = { dustCommand: 'dust' }

describe('createInstallRunner', () => {
  test('runs command and captures stdout', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter
      stderr: EventEmitter
    }
    mockProc.stdout = new EventEmitter()
    mockProc.stderr = new EventEmitter()

    const mockSpawn = () => mockProc

    const runner = createInstallRunner(mockSpawn as never)

    const promise = runner.run('echo test', '/test')

    // Simulate stdout data
    mockProc.stdout.emit('data', Buffer.from('test output'))
    mockProc.emit('close', 0)

    const result = await promise
    expect(result.exitCode).toBe(0)
    expect(result.output).toBe('test output')
  })

  test('runs command and captures stderr', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter
      stderr: EventEmitter
    }
    mockProc.stdout = new EventEmitter()
    mockProc.stderr = new EventEmitter()

    const mockSpawn = () => mockProc

    const runner = createInstallRunner(mockSpawn as never)

    const promise = runner.run('failing-command', '/test')

    // Simulate stderr data
    mockProc.stderr.emit('data', Buffer.from('error message'))
    mockProc.emit('close', 1)

    const result = await promise
    expect(result.exitCode).toBe(1)
    expect(result.output).toBe('error message')
  })

  test('handles process error', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter
      stderr: EventEmitter
    }
    mockProc.stdout = new EventEmitter()
    mockProc.stderr = new EventEmitter()

    const mockSpawn = () => mockProc

    const runner = createInstallRunner(mockSpawn as never)

    const promise = runner.run('bad-command', '/test')

    // Simulate error
    mockProc.emit('error', new Error('spawn error'))

    const result = await promise
    expect(result.exitCode).toBe(1)
    expect(result.output).toBe('spawn error')
  })

  test('defaults exit code to 1 when close code is null', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter
      stderr: EventEmitter
    }
    mockProc.stdout = new EventEmitter()
    mockProc.stderr = new EventEmitter()

    const mockSpawn = () => mockProc

    const runner = createInstallRunner(mockSpawn as never)

    const promise = runner.run('command', '/test')

    // Simulate close with null code
    mockProc.emit('close', null)

    const result = await promise
    expect(result.exitCode).toBe(1)
  })
})

describe('agent command', () => {
  test('outputs greeting with routing instructions', async () => {
    const context = createContextEmulator()
    const runner = createMockInstallRunner()

    const result = await agent(
      createDependencies(context, [], defaultSettings),
      runner
    )

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toMatch(/Hello .+, welcome to dust/)
    expect(context.stdoutLines.join('\n')).toContain('dust pick task')
    expect(context.stdoutLines.join('\n')).toContain('dust implement task')
    expect(context.stdoutLines.join('\n')).toContain('dust new task')
    expect(context.stdoutLines.join('\n')).toContain('dust new goal')
    expect(context.stdoutLines.join('\n')).toContain('dust new idea')
    expect(context.stdoutLines.join('\n')).toContain('dust help')
  })

  test('uses custom binary path in output', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = { dustCommand: 'bin/dust' }
    const runner = createMockInstallRunner()

    await agent(createDependencies(context, [], settings), runner)

    expect(context.stdoutLines.join('\n')).toContain('bin/dust pick task')
  })
})

describe('install command execution', () => {
  test('runs install command when configured', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      installCommand: 'npm install',
    }
    const runner = createMockInstallRunner(0, 'installed packages')

    await agent(createDependencies(context, [], settings), runner)

    expect(runner.calls).toHaveLength(1)
    expect(runner.calls[0].command).toBe('npm install')
    expect(context.stdoutLines.join('\n')).toContain('Running: npm install')
    expect(context.stdoutLines.join('\n')).toContain('installed packages')
    expect(context.stdoutLines.join('\n')).toContain(
      'Use `npm install` if you need to reinstall'
    )
  })

  test('shows greeting before running install command', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      installCommand: 'npm install',
    }
    const runner = createMockInstallRunner(0, '')

    await agent(createDependencies(context, [], settings), runner)

    const output = context.stdoutLines.join('\n')
    const greetingIndex = output.indexOf('welcome to dust')
    const installIndex = output.indexOf('Running: npm install')
    expect(greetingIndex).toBeLessThan(installIndex)
  })

  test('does not run install command when not configured', async () => {
    const context = createContextEmulator()
    const runner = createMockInstallRunner()

    await agent(createDependencies(context, [], defaultSettings), runner)

    expect(runner.calls).toHaveLength(0)
    expect(context.stdoutLines.join('\n')).not.toContain('Running:')
  })

  test('does not run install command when empty string', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      installCommand: '',
    }
    const runner = createMockInstallRunner()

    await agent(createDependencies(context, [], settings), runner)

    expect(runner.calls).toHaveLength(0)
  })

  test('shows error message when install command fails', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      installCommand: 'npm install',
    }
    const runner = createMockInstallRunner(1, 'error output')

    await agent(createDependencies(context, [], settings), runner)

    expect(context.stderrLines.join('\n')).toContain(
      'Install command failed with exit code 1'
    )
    // Should not show success message on failure
    expect(context.stdoutLines.join('\n')).not.toContain(
      'Dependencies installed'
    )
  })

  test('still shows greeting even when install command fails', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      installCommand: 'npm install',
    }
    const runner = createMockInstallRunner(1, '')

    const result = await agent(
      createDependencies(context, [], settings),
      runner
    )

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toMatch(/Hello .+, welcome to dust/)
  })

  test('passes correct working directory to install runner', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = {
      dustCommand: 'dust',
      installCommand: 'bun install',
    }
    const runner = createMockInstallRunner()

    await agent(createDependencies(context, [], settings), runner)

    expect(runner.calls[0].cwd).toBe('/project')
  })
})

describe('git hooks management', () => {
  test('installs hooks when git repo exists and hooks not installed', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.git': { hooks: {} } },
    })
    const runner = createMockInstallRunner()

    await agent(
      createDependencies(context, [], defaultSettings, fileSystem),
      runner
    )

    // Hook file should be created
    expect(fileSystem.writtenFiles.has('/project/.git/hooks/pre-push')).toBe(
      true
    )
    const hookContent = fileSystem.writtenFiles.get(
      '/project/.git/hooks/pre-push'
    )
    expect(hookContent).toContain('dust pre push')
  })

  test('does not install hooks when not a git repo', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    const runner = createMockInstallRunner()

    await agent(
      createDependencies(context, [], defaultSettings, fileSystem),
      runner
    )

    // No hook file should be created
    expect(fileSystem.writtenFiles.has('/project/.git/hooks/pre-push')).toBe(
      false
    )
  })

  test('updates binary path when hook installed with different path', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.git': {
          hooks: {
            'pre-push':
              '#!/bin/sh\n# BEGIN DUST HOOK\nold/path pre push\nif [ $? -ne 0 ]; then\n  exit 1\nfi\n# END DUST HOOK',
          },
        },
      },
    })
    const settings: DustSettings = { dustCommand: 'new/path' }
    const runner = createMockInstallRunner()

    await agent(createDependencies(context, [], settings, fileSystem), runner)

    // Hook should be updated with new path
    const hookContent = fileSystem.writtenFiles.get(
      '/project/.git/hooks/pre-push'
    )
    expect(hookContent).toContain('new/path pre push')
    expect(hookContent).not.toContain('old/path')
  })

  test('does not update hook when binary path matches settings', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.git': {
          hooks: {
            'pre-push':
              '#!/bin/sh\n# BEGIN DUST HOOK\ndust pre push\nif [ $? -ne 0 ]; then\n  exit 1\nfi\n# END DUST HOOK',
          },
        },
      },
    })
    const runner = createMockInstallRunner()

    await agent(
      createDependencies(context, [], defaultSettings, fileSystem),
      runner
    )

    // Hook should not be updated (paths match)
    expect(fileSystem.writtenFiles.has('/project/.git/hooks/pre-push')).toBe(
      false
    )
  })
})

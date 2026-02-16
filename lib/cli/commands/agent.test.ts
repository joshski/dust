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
import { agent } from './agent'

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

const defaultSettings: DustSettings = { dustCommand: 'dust' }

describe('agent command', () => {
  test('outputs greeting with routing instructions', async () => {
    const context = createContextEmulator()

    const result = await agent(createDependencies(context, [], defaultSettings))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toMatch(/Hello .+, welcome to dust/)
    expect(context.stdoutLines.join('\n')).toContain('dust pick task')
    expect(context.stdoutLines.join('\n')).toContain('dust focus')
    expect(context.stdoutLines.join('\n')).toContain('dust new task')
    expect(context.stdoutLines.join('\n')).toContain('dust new goal')
    expect(context.stdoutLines.join('\n')).toContain('dust new idea')
    expect(context.stdoutLines.join('\n')).toContain('dust help')
  })

  test('outputs skip message when DUST_SKIP_AGENT is set', async () => {
    const context = createContextEmulator()
    const env = { DUST_SKIP_AGENT: '1' }

    const result = await agent(
      createDependencies(context, [], defaultSettings),
      env
    )

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain(
      "You're running in an automated loop"
    )
    expect(context.stdoutLines.join('\n')).not.toContain('welcome to dust')
  })

  test('uses custom binary path in output', async () => {
    const context = createContextEmulator()
    const settings: DustSettings = { dustCommand: 'bin/dust' }

    await agent(createDependencies(context, [], settings))

    expect(context.stdoutLines.join('\n')).toContain('bin/dust pick task')
  })
})

describe('git hooks management', () => {
  test('installs hooks when git repo exists and hooks not installed', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.git': { hooks: {} } },
    })

    await agent(createDependencies(context, [], defaultSettings, fileSystem))

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

    await agent(createDependencies(context, [], defaultSettings, fileSystem))

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

    await agent(createDependencies(context, [], settings, fileSystem))

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

    await agent(createDependencies(context, [], defaultSettings, fileSystem))

    // Hook should not be updated (paths match)
    expect(fileSystem.writtenFiles.has('/project/.git/hooks/pre-push')).toBe(
      false
    )
  })
})

import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
} from '../test-utilities'
import type {
  CommandContext,
  CommandDependencies,
  DustSettings,
} from '../types'
import { agent } from './agent'

function createDeps(
  ctx: CommandContext,
  args: string[],
  settings: DustSettings,
  fsOverride?: FileSystemEmulator
): CommandDependencies {
  const fs = fsOverride || createFileSystemEmulator()
  return {
    arguments: args,
    context: ctx,
    fileSystem: fs,
    globScanner: fs,
    settings,
  }
}

const defaultSettings: DustSettings = { dustCommand: 'dust' }

describe('agent command', () => {
  test('outputs greeting with routing instructions', async () => {
    const ctx = createContextEmulator()

    const result = await agent(createDeps(ctx, [], defaultSettings))

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Hello Agent')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent pick task')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent implement task')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent new task')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent new goal')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent new idea')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent help')
  })

  test('uses custom binary path in output', async () => {
    const ctx = createContextEmulator()
    const settings: DustSettings = { dustCommand: 'bin/dust' }

    await agent(createDeps(ctx, [], settings))

    expect(ctx.stdoutLines.join('\n')).toContain('bin/dust agent pick task')
  })
})

describe('git hooks management', () => {
  test('installs hooks when git repo exists and hooks not installed', async () => {
    const ctx = createContextEmulator()
    const fs = createFileSystemEmulator({
      project: { '.git': { hooks: {} } },
    })

    await agent(createDeps(ctx, [], defaultSettings, fs))

    // Hook file should be created
    expect(fs.writtenFiles.has('/project/.git/hooks/pre-push')).toBe(true)
    const hookContent = fs.writtenFiles.get('/project/.git/hooks/pre-push')
    expect(hookContent).toContain('dust pre push')
  })

  test('does not install hooks when not a git repo', async () => {
    const ctx = createContextEmulator()
    const fs = createFileSystemEmulator()

    await agent(createDeps(ctx, [], defaultSettings, fs))

    // No hook file should be created
    expect(fs.writtenFiles.has('/project/.git/hooks/pre-push')).toBe(false)
  })

  test('updates binary path when hook installed with different path', async () => {
    const ctx = createContextEmulator()
    const fs = createFileSystemEmulator({
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

    await agent(createDeps(ctx, [], settings, fs))

    // Hook should be updated with new path
    const hookContent = fs.writtenFiles.get('/project/.git/hooks/pre-push')
    expect(hookContent).toContain('new/path pre push')
    expect(hookContent).not.toContain('old/path')
  })

  test('does not update hook when binary path matches settings', async () => {
    const ctx = createContextEmulator()
    const fs = createFileSystemEmulator({
      project: {
        '.git': {
          hooks: {
            'pre-push':
              '#!/bin/sh\n# BEGIN DUST HOOK\ndust pre push\nif [ $? -ne 0 ]; then\n  exit 1\nfi\n# END DUST HOOK',
          },
        },
      },
    })

    await agent(createDeps(ctx, [], defaultSettings, fs))

    // Hook should not be updated (paths match)
    expect(fs.writtenFiles.has('/project/.git/hooks/pre-push')).toBe(false)
  })
})

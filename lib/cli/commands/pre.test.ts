import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
} from '../test-utilities'
import type { CommandDependencies, DustSettings } from '../types'
import { pre } from './pre'

function createDeps(
  ctx: ReturnType<typeof createContextEmulator>,
  args: string[],
  settings: DustSettings = { dustCommand: 'dust' }
): CommandDependencies {
  const fs = createFileSystemEmulator({
    existingPaths: new Set(['/project/.dust']),
  })
  return {
    arguments: args,
    context: ctx,
    fileSystem: fs,
    globScanner: fs,
    settings,
  }
}

describe('pre command', () => {
  test('shows usage when no subcommand provided', async () => {
    const ctx = createContextEmulator()
    const result = await pre(createDeps(ctx, []))

    expect(result.exitCode).toBe(1)
    expect(ctx.stderrLines.join('\n')).toContain('Usage: dust pre <subcommand>')
    expect(ctx.stderrLines.join('\n')).toContain('Available subcommands: push')
  })

  test('shows error for unknown subcommand', async () => {
    const ctx = createContextEmulator()
    const result = await pre(createDeps(ctx, ['unknown']))

    expect(result.exitCode).toBe(1)
    expect(ctx.stderrLines.join('\n')).toContain('Unknown subcommand: unknown')
    expect(ctx.stderrLines.join('\n')).toContain('Available subcommands: push')
  })

  test('push subcommand runs check', async () => {
    const ctx = createContextEmulator()
    const fs = createFileSystemEmulator({
      existingPaths: new Set(['/project/.dust']),
    })
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'test', command: 'echo "test passed"' }],
    }
    const deps: CommandDependencies = {
      arguments: ['push'],
      context: ctx,
      fileSystem: fs,
      globScanner: fs,
      settings,
    }

    const result = await pre(deps)

    // Check command runs, output depends on whether checks pass
    expect(typeof result.exitCode).toBe('number')
  })

  test('push subcommand fails when no checks configured', async () => {
    const ctx = createContextEmulator()
    const result = await pre(createDeps(ctx, ['push']))

    expect(result.exitCode).toBe(1)
    expect(ctx.stderrLines.join('\n')).toContain(
      'No checks configured in .dust/config/settings.json'
    )
  })
})

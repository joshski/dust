import { describe, expect, test } from 'vitest'
import {
  createMockContext,
  createMockFileSystem,
  createMockGlobScanner,
} from '../test-utilities'
import type {
  CommandContext,
  CommandDependencies,
  DustSettings,
} from '../types'
import { AGENT_SUBCOMMANDS, agent } from './agent'

function createDeps(
  ctx: CommandContext,
  args: string[],
  settings: DustSettings
): CommandDependencies {
  return {
    arguments: args,
    context: ctx,
    fileSystem: createMockFileSystem(),
    globScanner: createMockGlobScanner(),
    settings,
  }
}

const defaultSettings: DustSettings = { dustCommand: 'dust' }

describe('agent command', () => {
  test('outputs greeting with routing instructions when no subcommand', async () => {
    const ctx = createMockContext()

    const result = await agent(createDeps(ctx, [], defaultSettings))

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Hello Agent')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent work')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent implement')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent task')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent goal')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent idea')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent help')
  })

  test('work subcommand outputs work instructions', async () => {
    const ctx = createMockContext()

    const result = await agent(createDeps(ctx, ['work'], defaultSettings))

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Pick a Task')
    expect(ctx.stdoutLines.join('\n')).toContain('dust next')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent implement')
  })

  test('implement subcommand outputs implementation instructions', async () => {
    const ctx = createMockContext()

    const result = await agent(createDeps(ctx, ['implement'], defaultSettings))

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Implement a Task')
    expect(ctx.stdoutLines.join('\n')).toContain('dust check')
  })

  test('task subcommand outputs task creation instructions', async () => {
    const ctx = createMockContext()

    const result = await agent(createDeps(ctx, ['task'], defaultSettings))

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Adding a New Task')
    expect(ctx.stdoutLines.join('\n')).toContain('dust list ideas')
    expect(ctx.stdoutLines.join('\n')).toContain('.dust/tasks/')
  })

  test('goal subcommand outputs goals instructions', async () => {
    const ctx = createMockContext()

    const result = await agent(createDeps(ctx, ['goal'], defaultSettings))

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Understanding Goals')
    expect(ctx.stdoutLines.join('\n')).toContain('dust list goals')
    expect(ctx.stdoutLines.join('\n')).toContain('.dust/goals/')
  })

  test('idea subcommand outputs ideas instructions', async () => {
    const ctx = createMockContext()

    const result = await agent(createDeps(ctx, ['idea'], defaultSettings))

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Working with Ideas')
    expect(ctx.stdoutLines.join('\n')).toContain('dust list ideas')
    expect(ctx.stdoutLines.join('\n')).toContain('.dust/ideas/')
  })

  test('help subcommand outputs agent help', async () => {
    const ctx = createMockContext()

    const result = await agent(createDeps(ctx, ['help'], defaultSettings))

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Dust Agent Guide')
    expect(ctx.stdoutLines.join('\n')).toContain('dust check')
    expect(ctx.stdoutLines.join('\n')).toContain('dust next')
  })

  test('unknown subcommand returns error', async () => {
    const ctx = createMockContext()

    const result = await agent(createDeps(ctx, ['unknown'], defaultSettings))

    expect(result.exitCode).toBe(1)
    expect(ctx.stderrLines.join('\n')).toContain('Unknown subcommand: unknown')
    expect(ctx.stderrLines.join('\n')).toContain('Available:')
  })

  test('uses custom binary path in output', async () => {
    const ctx = createMockContext()
    const settings: DustSettings = { dustCommand: 'bin/dust' }

    await agent(createDeps(ctx, [], settings))

    expect(ctx.stdoutLines.join('\n')).toContain('bin/dust agent work')
  })

  test('AGENT_SUBCOMMANDS contains expected commands', () => {
    expect(AGENT_SUBCOMMANDS).toContain('work')
    expect(AGENT_SUBCOMMANDS).toContain('implement')
    expect(AGENT_SUBCOMMANDS).toContain('task')
    expect(AGENT_SUBCOMMANDS).toContain('goal')
    expect(AGENT_SUBCOMMANDS).toContain('idea')
    expect(AGENT_SUBCOMMANDS).toContain('help')
    expect(AGENT_SUBCOMMANDS.length).toBe(6)
  })
})

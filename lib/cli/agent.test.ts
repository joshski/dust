import { describe, expect, test } from 'vitest'
import { AGENT_SUBCOMMANDS, agent } from './agent'
import type { DustSettings } from './settings'
import type { CommandContext } from './types'

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

const defaultSettings: DustSettings = { dustCommand: 'dust' }

describe('agent command', () => {
  test('outputs greeting with routing instructions when no subcommand', async () => {
    const ctx = createMockContext()

    const result = await agent(ctx, [], defaultSettings)

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Hello Claude')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent work')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent tasks')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent goals')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent ideas')
    expect(ctx.stdoutLines.join('\n')).toContain('dust agent help')
  })

  test('work subcommand outputs work instructions', async () => {
    const ctx = createMockContext()

    const result = await agent(ctx, ['work'], defaultSettings)

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Work on the Next Task')
    expect(ctx.stdoutLines.join('\n')).toContain('dust check')
    expect(ctx.stdoutLines.join('\n')).toContain('dust next')
  })

  test('tasks subcommand outputs task management instructions', async () => {
    const ctx = createMockContext()

    const result = await agent(ctx, ['tasks'], defaultSettings)

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Task Management')
    expect(ctx.stdoutLines.join('\n')).toContain('dust list tasks')
    expect(ctx.stdoutLines.join('\n')).toContain('.dust/tasks/')
  })

  test('goals subcommand outputs goals instructions', async () => {
    const ctx = createMockContext()

    const result = await agent(ctx, ['goals'], defaultSettings)

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Understanding Goals')
    expect(ctx.stdoutLines.join('\n')).toContain('dust list goals')
    expect(ctx.stdoutLines.join('\n')).toContain('.dust/goals/')
  })

  test('ideas subcommand outputs ideas instructions', async () => {
    const ctx = createMockContext()

    const result = await agent(ctx, ['ideas'], defaultSettings)

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Working with Ideas')
    expect(ctx.stdoutLines.join('\n')).toContain('dust list ideas')
    expect(ctx.stdoutLines.join('\n')).toContain('.dust/ideas/')
  })

  test('help subcommand outputs agent help', async () => {
    const ctx = createMockContext()

    const result = await agent(ctx, ['help'], defaultSettings)

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Dust Agent Guide')
    expect(ctx.stdoutLines.join('\n')).toContain('dust check')
    expect(ctx.stdoutLines.join('\n')).toContain('dust next')
  })

  test('unknown subcommand returns error', async () => {
    const ctx = createMockContext()

    const result = await agent(ctx, ['unknown'], defaultSettings)

    expect(result.exitCode).toBe(1)
    expect(ctx.stderrLines.join('\n')).toContain('Unknown subcommand: unknown')
    expect(ctx.stderrLines.join('\n')).toContain('Available:')
  })

  test('uses custom binary path in output', async () => {
    const ctx = createMockContext()
    const settings: DustSettings = { dustCommand: 'bin/dust' }

    await agent(ctx, [], settings)

    expect(ctx.stdoutLines.join('\n')).toContain('bin/dust agent work')
  })

  test('AGENT_SUBCOMMANDS contains expected commands', () => {
    expect(AGENT_SUBCOMMANDS).toContain('work')
    expect(AGENT_SUBCOMMANDS).toContain('tasks')
    expect(AGENT_SUBCOMMANDS).toContain('goals')
    expect(AGENT_SUBCOMMANDS).toContain('ideas')
    expect(AGENT_SUBCOMMANDS).toContain('help')
    expect(AGENT_SUBCOMMANDS.length).toBe(5)
  })
})

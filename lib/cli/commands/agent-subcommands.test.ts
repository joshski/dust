import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
} from '../test-utilities'
import type { CommandDependencies, DustSettings } from '../types'
import { agentHelp } from './agent-help'
import { agentImplementTask } from './agent-implement-task'
import { agentNewGoal } from './agent-new-goal'
import { agentNewIdea } from './agent-new-idea'
import { agentNewTask } from './agent-new-task'
import { agentPickTask } from './agent-pick-task'
import { agentUnderstandGoals } from './agent-understand-goals'

const defaultSettings: DustSettings = { dustCommand: 'dust' }

function createDeps(settings: DustSettings = defaultSettings): {
  ctx: ReturnType<typeof createContextEmulator>
  deps: CommandDependencies
} {
  const ctx = createContextEmulator()
  const fs = createFileSystemEmulator()
  return {
    ctx,
    deps: {
      arguments: [],
      context: ctx,
      fileSystem: fs,
      globScanner: fs,
      settings,
    },
  }
}

describe('agent-help', () => {
  test('outputs agent help text', async () => {
    const { ctx, deps } = createDeps()
    const result = await agentHelp(deps)

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Dust Agent Guide')
  })
})

describe('agent-new-task', () => {
  test('outputs task creation instructions', async () => {
    const { ctx, deps } = createDeps()
    const result = await agentNewTask(deps)

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Adding a New Task')
  })
})

describe('agent-new-goal', () => {
  test('outputs goal creation instructions', async () => {
    const { ctx, deps } = createDeps()
    const result = await agentNewGoal(deps)

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Adding a New Goal')
  })
})

describe('agent-new-idea', () => {
  test('outputs idea creation instructions', async () => {
    const { ctx, deps } = createDeps()
    const result = await agentNewIdea(deps)

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Adding a New Idea')
  })
})

describe('agent-implement-task', () => {
  test('outputs implementation instructions', async () => {
    const { ctx, deps } = createDeps()
    const result = await agentImplementTask(deps)

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Implement a Task')
  })
})

describe('agent-pick-task', () => {
  test('outputs pick task instructions', async () => {
    const { ctx, deps } = createDeps()
    const result = await agentPickTask(deps)

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Pick a Task')
  })
})

describe('agent-understand-goals', () => {
  test('outputs goals understanding instructions', async () => {
    const { ctx, deps } = createDeps()
    const result = await agentUnderstandGoals(deps)

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Understanding Goals')
  })
})

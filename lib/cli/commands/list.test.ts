import { describe, expect, test } from 'vitest'
import { createCommandDependencies } from '../../test/test-utilities'
import { list } from './list'

function output(context: { stdoutLines: string[] }) {
  return context.stdoutLines.join('\n')
}

describe('list command', () => {
  test('fails if .dust not found', async () => {
    const { context, dependencies } = createCommandDependencies()

    const result = await list(dependencies)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('.dust directory not found')
  })

  test('lists all types when no argument given', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            goals: { 'goal.md': '# My Goal' },
            ideas: { 'idea.md': '# My Idea' },
            tasks: { 'task.md': '# My Task' },
            facts: { 'fact.md': '# My Fact' },
          },
        },
      },
    })

    const result = await list(dependencies)

    expect(result.exitCode).toBe(0)
    expect(output(context)).toContain('🎯 Goals')
    expect(output(context)).toContain('💡 Ideas')
    expect(output(context)).toContain('📋 Tasks')
    expect(output(context)).toContain('📄 Facts')
  })

  test('lists only specified type', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            goals: { 'goal.md': '# My Goal' },
            ideas: { 'idea.md': '# My Idea' },
          },
        },
      },
      args: ['goals'],
    })

    const result = await list(dependencies)

    expect(result.exitCode).toBe(0)
    expect(output(context)).toContain('🎯 Goals')
    expect(output(context)).not.toContain('💡 Ideas')
  })

  test('shows relative path and opening sentence', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            goals: {
              'my-goal.md': '# My Goal Title\n\nThis is the opening sentence.',
            },
          },
        },
      },
      args: ['goals'],
    })

    await list(dependencies)

    expect(output(context)).toContain('.dust/goals/my-goal.md')
    expect(output(context)).toContain('This is the opening sentence.')
  })

  test('shows only file name if no title', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            goals: { 'my-goal.md': 'No heading here' },
          },
        },
      },
      args: ['goals'],
    })

    await list(dependencies)

    expect(output(context)).toContain('my-goal')
  })

  test('rejects invalid type', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: { project: { '.dust': { goals: { 'g.md': '' } } } },
      args: ['invalid'],
    })

    const result = await list(dependencies)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Invalid type')
  })

  test('shows valid types on error', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: { project: { '.dust': { goals: { 'g.md': '' } } } },
      args: ['invalid'],
    })

    await list(dependencies)

    const stderr = context.stderrLines.join('\n')
    expect(stderr).toContain('tasks')
    expect(stderr).toContain('ideas')
    expect(stderr).toContain('goals')
    expect(stderr).toContain('facts')
  })

  test('skips type directories that do not exist', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            goals: { 'my-goal.md': '# My Goal' },
          },
        },
      },
    })

    const result = await list(dependencies)

    expect(result.exitCode).toBe(0)
    expect(output(context)).toContain('🎯 Goals')
    expect(output(context)).toContain('My Goal')
    expect(output(context)).not.toContain('📋 Tasks')
    expect(output(context)).not.toContain('💡 Ideas')
    expect(output(context)).not.toContain('📄 Facts')
  })

  test('skips type directories with no markdown files', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            goals: { 'my-goal.md': '# My Goal' },
            ideas: {},
          },
        },
      },
    })

    const result = await list(dependencies)

    expect(result.exitCode).toBe(0)
    expect(output(context)).toContain('🎯 Goals')
    expect(output(context)).not.toContain('💡 Ideas')
  })

  test('shows "No tasks found." when listing tasks and none exist', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            goals: { 'my-goal.md': '# My Goal' },
          },
        },
      },
      args: ['tasks'],
    })

    const result = await list(dependencies)

    expect(result.exitCode).toBe(0)
    expect(output(context)).toContain('📋 Tasks')
    expect(output(context)).toContain('No tasks found.')
  })

  test('shows "No ideas found." when listing ideas and none exist', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: { project: { '.dust': { ideas: {} } } },
      args: ['ideas'],
    })

    const result = await list(dependencies)

    expect(result.exitCode).toBe(0)
    expect(output(context)).toContain('💡 Ideas')
    expect(output(context)).toContain('No ideas found.')
  })

  test('shows type explanation for tasks', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: { project: { '.dust': { tasks: { 'task.md': '# My Task' } } } },
      args: ['tasks'],
    })

    await list(dependencies)

    expect(output(context)).toContain(
      'Tasks are detailed work plans with dependencies and completion criteria'
    )
  })

  test('shows type explanation for ideas', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: { project: { '.dust': { ideas: { 'idea.md': '# My Idea' } } } },
      args: ['ideas'],
    })

    await list(dependencies)

    expect(output(context)).toContain(
      'Ideas are future feature notes and proposals'
    )
  })

  test('shows type explanation for goals', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: { project: { '.dust': { goals: { 'goal.md': '# My Goal' } } } },
      args: ['goals'],
    })

    await list(dependencies)

    expect(output(context)).toContain(
      'Goals are mission statements and guiding principles'
    )
  })

  test('shows type explanation for facts', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: { project: { '.dust': { facts: { 'fact.md': '# My Fact' } } } },
      args: ['facts'],
    })

    await list(dependencies)

    expect(output(context)).toContain('Facts are current state documentation')
  })

  test('shows type explanation even when no items exist', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: { project: { '.dust': { tasks: {} } } },
      args: ['tasks'],
    })

    await list(dependencies)

    expect(output(context)).toContain(
      'Tasks are detailed work plans with dependencies and completion criteria'
    )
    expect(output(context)).toContain('No tasks found.')
  })

  test('shows goal hierarchy with parent and sub-goals', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            goals: {
              'parent-goal.md': `# Parent Goal

This is a top-level goal.

## Parent Goal

- (none)

## Sub-Goals

- [Child Goal](child-goal.md)
`,
              'child-goal.md': `# Child Goal

This is a child goal.

## Parent Goal

- [Parent Goal](parent-goal.md)

## Sub-Goals

- [Grandchild Goal](grandchild-goal.md)
`,
              'grandchild-goal.md': `# Grandchild Goal

This is a grandchild goal.

## Parent Goal

- [Child Goal](child-goal.md)

## Sub-Goals

- (none)
`,
            },
          },
        },
      },
      args: ['goals'],
    })

    await list(dependencies)

    expect(output(context)).toContain('Hierarchy:')
    expect(output(context)).toContain('Parent Goal')
    expect(output(context)).toContain('Child Goal')
    expect(output(context)).toContain('Grandchild Goal')
    expect(output(context)).toContain('└── Parent Goal')
    expect(output(context)).toContain('└── Child Goal')
    expect(output(context)).toContain('└── Grandchild Goal')
  })

  test('shows multiple root goals in hierarchy', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            goals: {
              'root-one.md': `# Root One

First root.

## Parent Goal

- (none)

## Sub-Goals

- (none)
`,
              'root-two.md': `# Root Two

Second root.

## Parent Goal

- (none)

## Sub-Goals

- (none)
`,
            },
          },
        },
      },
      args: ['goals'],
    })

    await list(dependencies)

    expect(output(context)).toContain('Root One')
    expect(output(context)).toContain('Root Two')
    expect(output(context)).toContain('├── Root One')
    expect(output(context)).toContain('└── Root Two')
  })

  test('handles sub-goal references to non-existent goals gracefully', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            goals: {
              'parent-goal.md': `# Parent Goal

This is a parent goal.

## Parent Goal

- (none)

## Sub-Goals

- [Non Existent](non-existent-goal.md)
`,
            },
          },
        },
      },
      args: ['goals'],
    })

    await list(dependencies)

    expect(output(context)).toContain('Hierarchy:')
    expect(output(context)).toContain('Parent Goal')
    expect(output(context)).toContain('non-existent-goal')
  })

  test('does not show hierarchy when all goals have parents', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            goals: {
              'orphan-goal.md': `# Orphan Goal

This goal has a parent that does not exist.

## Parent Goal

- [Missing Parent](missing-parent.md)

## Sub-Goals

- (none)
`,
            },
          },
        },
      },
      args: ['goals'],
    })

    await list(dependencies)

    expect(output(context)).toContain('🎯 Goals')
    expect(output(context)).toContain('Orphan Goal')
    expect(output(context)).not.toContain('Hierarchy:')
  })
})

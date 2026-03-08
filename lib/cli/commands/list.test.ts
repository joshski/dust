import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
} from '../../test/test-utilities'
import type { CommandContext, CommandDependencies } from '../types'
import { list } from './list'

function createDependencies(
  context: CommandContext,
  fileSystem: FileSystemEmulator,
  commandArguments: string[] = [],
  dustCommand = 'dust'
): CommandDependencies {
  return {
    arguments: commandArguments,
    context,
    fileSystem,
    globScanner: fileSystem,
    settings: { dustCommand },
  }
}

describe('list command', () => {
  test('fails if .dust not found', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()

    const result = await list(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      '.dust directory not found'
    )
  })

  test('lists all types when no argument given', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: { 'principle.md': '# My Principle' },
          ideas: { 'idea.md': '# My Idea' },
          tasks: { 'task.md': '# My Task' },
          facts: { 'fact.md': '# My Fact' },
        },
      },
    })

    const result = await list(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('🎯 Principles')
    expect(output).toContain('💡 Ideas')
    expect(output).toContain('📋 Tasks')
    expect(output).toContain('📄 Facts')
  })

  test('lists only specified type', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: { 'principle.md': '# My Principle' },
          ideas: { 'idea.md': '# My Idea' },
        },
      },
    })

    const result = await list(
      createDependencies(context, fileSystem, ['principles'])
    )

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('🎯 Principles')
    expect(output).not.toContain('💡 Ideas')
  })

  test('shows relative path and opening sentence', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'my-principle.md':
              '# My Principle Title\n\nThis is the opening sentence.',
          },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['principles']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('.dust/principles/my-principle.md')
    expect(output).toContain('This is the opening sentence.')
  })

  test('shows only file name if no title', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: { 'my-principle.md': 'No heading here' },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['principles']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('my-principle')
  })

  test('rejects invalid type', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: { 'g.md': '' },
        },
      },
    })

    const result = await list(
      createDependencies(context, fileSystem, ['invalid'])
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Invalid type')
  })

  test('shows valid types on error', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: { 'g.md': '' },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['invalid']))

    const output = context.stderrLines.join('\n')
    expect(output).toContain('tasks')
    expect(output).toContain('ideas')
    expect(output).toContain('principles')
    expect(output).toContain('facts')
  })

  test('skips type directories that do not exist', async () => {
    const context = createContextEmulator()
    // Only principles directory exists, tasks/ideas/facts do not
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: { 'my-principle.md': '# My Principle' },
        },
      },
    })

    const result = await list(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('🎯 Principles')
    expect(output).toContain('My Principle')
    // Other types should not appear because their directories don't exist
    expect(output).not.toContain('📋 Tasks')
    expect(output).not.toContain('💡 Ideas')
    expect(output).not.toContain('📄 Facts')
  })

  test('skips type directories with no markdown files', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: { 'my-principle.md': '# My Principle' },
          ideas: {},
        },
      },
    })

    const result = await list(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('🎯 Principles')
    // ideas exists but has no .md files, so should not be listed
    expect(output).not.toContain('💡 Ideas')
  })

  test('shows "No tasks found." when listing tasks and none exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: { 'my-principle.md': '# My Principle' },
        },
      },
    })

    const result = await list(
      createDependencies(context, fileSystem, ['tasks'])
    )

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('📋 Tasks')
    expect(output).toContain('No tasks found.')
    expect(output).toContain('➕ Add a New Task')
    expect(output).toContain('Run `dust new task`')
  })

  test('shows add task hint with active command when listing tasks', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: { 'task.md': '# My Task' },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['tasks'], 'bunx dust'))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('➕ Add a New Task')
    expect(output).toContain('Run `bunx dust new task`')
  })

  test('does not show add task hint for non-task listings', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'idea.md': '# My Idea' },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['ideas']))

    const output = context.stdoutLines.join('\n')
    expect(output).not.toContain('➕ Add a New Task')
    expect(output).not.toContain('new task')
  })

  test('shows "No ideas found." when listing ideas and none exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {},
        },
      },
    })

    const result = await list(
      createDependencies(context, fileSystem, ['ideas'])
    )

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('💡 Ideas')
    expect(output).toContain('No ideas found.')
  })

  test('shows type explanation for tasks', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: { 'task.md': '# My Task' },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['tasks']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain(
      'Tasks are detailed work plans with dependencies and completion criteria'
    )
  })

  test('shows type explanation for ideas', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'idea.md': '# My Idea' },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['ideas']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('Ideas are future feature notes and proposals')
  })

  test('shows type explanation for principles', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: { 'principle.md': '# My Principle' },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['principles']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain(
      'Principles are guiding values and design constraints'
    )
  })

  test('shows type explanation for facts', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          facts: { 'fact.md': '# My Fact' },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['facts']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('Facts are current state documentation')
  })

  test('shows type explanation even when no items exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {},
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['tasks']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain(
      'Tasks are detailed work plans with dependencies and completion criteria'
    )
    expect(output).toContain('No tasks found.')
  })

  test('shows principle hierarchy with parent and sub-principles', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'parent-principle.md': `# Parent Principle

This is a top-level principle.

## Parent Principle

- (none)

## Sub-Principles

- [Child Principle](child-principle.md)
`,
            'child-principle.md': `# Child Principle

This is a child principle.

## Parent Principle

- [Parent Principle](parent-principle.md)

## Sub-Principles

- [Grandchild Principle](grandchild-principle.md)
`,
            'grandchild-principle.md': `# Grandchild Principle

This is a grandchild principle.

## Parent Principle

- [Child Principle](child-principle.md)

## Sub-Principles

- (none)
`,
          },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['principles']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('Hierarchy:')
    expect(output).toContain('Parent Principle')
    expect(output).toContain('Child Principle')
    expect(output).toContain('Grandchild Principle')
    // Check tree structure is present (└── for last/only children)
    expect(output).toContain('└── Parent Principle')
    expect(output).toContain('└── Child Principle')
    expect(output).toContain('└── Grandchild Principle')
  })

  test('shows multiple root principles in hierarchy', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'root-one.md': `# Root One

First root.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
            'root-two.md': `# Root Two

Second root.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['principles']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('Root One')
    expect(output).toContain('Root Two')
    // With multiple roots, the first one uses ├── and last uses └──
    expect(output).toContain('├── Root One')
    expect(output).toContain('└── Root Two')
  })

  test('handles sub-principle references to non-existent principles gracefully', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'parent-principle.md': `# Parent Principle

This is a parent principle.

## Parent Principle

- (none)

## Sub-Principles

- [Non Existent](non-existent-principle.md)
`,
          },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['principles']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('Hierarchy:')
    expect(output).toContain('Parent Principle')
    // The non-existent principle should be shown with its basename
    expect(output).toContain('non-existent-principle')
  })

  test('does not show hierarchy when all principles have parents', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'orphan-principle.md': `# Orphan Principle

This principle has a parent that does not exist.

## Parent Principle

- [Missing Parent](missing-parent.md)

## Sub-Principles

- (none)
`,
          },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['principles']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('🎯 Principles')
    expect(output).toContain('Orphan Principle')
    // No hierarchy because no root principles exist
    expect(output).not.toContain('Hierarchy:')
  })
})

describe('list command event emission', () => {
  test('emits facts-listed event when listing facts', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          facts: {
            'first-fact.md': '# First Fact',
            'second-fact.md': '# Second Fact',
          },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['facts']))

    expect(context.emittedEvents).toHaveLength(1)
    expect(context.emittedEvents[0]).toEqual({
      type: 'facts-listed',
      facts: [
        { path: '.dust/facts/first-fact.md', title: 'First Fact' },
        { path: '.dust/facts/second-fact.md', title: 'Second Fact' },
      ],
    })
  })

  test('emits ideas-listed event with draft status when no workflow task exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'my-idea.md': '# My Idea',
          },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['ideas']))

    expect(context.emittedEvents).toHaveLength(1)
    expect(context.emittedEvents[0]).toEqual({
      type: 'ideas-listed',
      ideas: [
        { path: '.dust/ideas/my-idea.md', title: 'My Idea', status: 'draft' },
      ],
    })
  })

  test('emits ideas-listed event with refining status when refine task exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'my-idea.md': '# My Idea',
          },
          tasks: {
            'refine-idea-my-idea.md': `# Refine Idea: My Idea

Refine this idea.

## Refines Idea

- [My Idea](../ideas/my-idea.md)

## Blocked By

(none)

## Definition of Done

- [ ] Done
`,
          },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['ideas']))

    expect(context.emittedEvents).toHaveLength(1)
    expect(context.emittedEvents[0]).toEqual({
      type: 'ideas-listed',
      ideas: [
        {
          path: '.dust/ideas/my-idea.md',
          title: 'My Idea',
          status: 'refining',
        },
      ],
    })
  })

  test('emits ideas-listed event with decomposing status when decompose task exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'my-idea.md': '# My Idea',
          },
          tasks: {
            'decompose-idea-my-idea.md': `# Decompose Idea: My Idea

Decompose this idea.

## Decomposes Idea

- [My Idea](../ideas/my-idea.md)

## Blocked By

(none)

## Definition of Done

- [ ] Done
`,
          },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['ideas']))

    expect(context.emittedEvents).toHaveLength(1)
    expect(context.emittedEvents[0]).toEqual({
      type: 'ideas-listed',
      ideas: [
        {
          path: '.dust/ideas/my-idea.md',
          title: 'My Idea',
          status: 'decomposing',
        },
      ],
    })
  })

  test('emits ideas-listed event with shelving status when shelve task exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'my-idea.md': '# My Idea',
          },
          tasks: {
            'shelve-idea-my-idea.md': `# Shelve Idea: My Idea

Shelve this idea.

## Shelves Idea

- [My Idea](../ideas/my-idea.md)

## Blocked By

(none)

## Definition of Done

- [ ] Done
`,
          },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['ideas']))

    expect(context.emittedEvents).toHaveLength(1)
    expect(context.emittedEvents[0]).toEqual({
      type: 'ideas-listed',
      ideas: [
        {
          path: '.dust/ideas/my-idea.md',
          title: 'My Idea',
          status: 'shelving',
        },
      ],
    })
  })

  test('emits principles-listed event when listing principles', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'first-principle.md': '# First Principle',
            'second-principle.md': '# Second Principle',
          },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['principles']))

    expect(context.emittedEvents).toHaveLength(1)
    expect(context.emittedEvents[0]).toEqual({
      type: 'principles-listed',
      principles: [
        {
          path: '.dust/principles/first-principle.md',
          title: 'First Principle',
        },
        {
          path: '.dust/principles/second-principle.md',
          title: 'Second Principle',
        },
      ],
    })
  })

  test('emits empty facts-listed event when no facts exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          facts: {},
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['facts']))

    expect(context.emittedEvents).toHaveLength(1)
    expect(context.emittedEvents[0]).toEqual({
      type: 'facts-listed',
      facts: [],
    })
  })

  test('emits empty ideas-listed event when no ideas exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {},
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['ideas']))

    expect(context.emittedEvents).toHaveLength(1)
    expect(context.emittedEvents[0]).toEqual({
      type: 'ideas-listed',
      ideas: [],
    })
  })

  test('emits empty principles-listed event when no principles exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {},
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['principles']))

    expect(context.emittedEvents).toHaveLength(1)
    expect(context.emittedEvents[0]).toEqual({
      type: 'principles-listed',
      principles: [],
    })
  })

  test('uses filename as title when no heading exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          facts: {
            'my-fact.md': 'No heading here, just content.',
          },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['facts']))

    expect(context.emittedEvents).toHaveLength(1)
    expect(context.emittedEvents[0]).toEqual({
      type: 'facts-listed',
      facts: [{ path: '.dust/facts/my-fact.md', title: 'my-fact' }],
    })
  })
})

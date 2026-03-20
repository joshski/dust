import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  createTestRuntimeConfig,
  type FileSystemEmulator,
} from '../../test/test-utilities'
import type { CommandContext, CommandDependencies } from '../types'
import { formatPrincipleEntry, formatPrinciplesSection, list } from './list'

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
    runtime: createTestRuntimeConfig(),
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

  test('shows slug and opening sentence in compact format', async () => {
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
    expect(output).toContain('* my-principle.md')
    expect(output).toContain('  This is the opening sentence.')
  })

  test('shows slug without opening sentence if none found', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'my-principle.md': '# No Opening Sentence\n\n- List item',
          },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['principles']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('* my-principle.md')
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
    expect(output).toContain('* my-principle.md')
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

  test('handles facts without opening sentences', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          facts: {
            'my-fact.md': '# My Fact\n\n- List item instead of paragraph',
          },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['facts']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('📄 Facts')
    expect(output).toContain('My Fact')
  })

  test('shows opening sentence for facts when present', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          facts: { 'my-fact.md': '# My Fact\n\nThis is the opening sentence.' },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['facts']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('📄 Facts')
    expect(output).toContain('This is the opening sentence.')
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

  test('shows principles in compact format with slugs', async () => {
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
    // Core section for built-in principles
    expect(output).toContain('🎯 Core Principles')
    // Local section for project principles
    expect(output).toContain('🎯 Local Principles (.dust/principles/)')
    // Compact format uses slugs with .md extension
    expect(output).toContain('* parent-principle.md')
    expect(output).toContain('* child-principle.md')
    expect(output).toContain('* grandchild-principle.md')
    // Opening sentences are indented
    expect(output).toContain('  This is a top-level principle.')
    expect(output).toContain('  This is a child principle.')
    expect(output).toContain('  This is a grandchild principle.')
  })

  test('shows multiple principles sorted alphabetically by slug', async () => {
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
    // Compact format uses slugs with .md extension
    expect(output).toContain('* root-one.md')
    expect(output).toContain('* root-two.md')
    // Opening sentences are indented
    expect(output).toContain('  First root.')
    expect(output).toContain('  Second root.')
  })

  test('shows principles using compact slug format', async () => {
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
    // Shows Local section for project principles
    expect(output).toContain('🎯 Local Principles (.dust/principles/)')
    expect(output).toContain('* parent-principle.md')
    expect(output).toContain('  This is a parent principle.')
  })

  test('shows all principles regardless of hierarchy relationships', async () => {
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
    expect(output).toContain('* orphan-principle.md')
    expect(output).toContain(
      '  This principle has a parent that does not exist.'
    )
  })
})

describe('list command Core and Local principles sections', () => {
  test('shows Core section with built-in principles in compact format', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {},
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['principles']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('🎯 Principles')
    expect(output).toContain('🎯 Core Principles')
    // Core principles should include enable-flow-state.md
    expect(output).toContain('* enable-flow-state.md')
  })

  test('shows Local section when local principles exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'my-local-principle.md': `# My Local Principle

A local project principle.

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
    expect(output).toContain('🎯 Local Principles (.dust/principles/)')
    expect(output).toContain('* my-local-principle.md')
    expect(output).toContain('  A local project principle.')
  })

  test('excludes core principles based on excludeCorePrinciples setting', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {},
        },
      },
    })

    const dependencies = {
      arguments: ['principles'],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: {
        dustCommand: 'dust',
        excludeCorePrinciples: ['enable-flow-state'],
      },
    }

    await list(dependencies)

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('🎯 Core Principles')
    // Enable Flow State should be excluded
    expect(output).not.toContain('* enable-flow-state.md')
    // Other principles should still be present
    expect(output).toContain('* maintainable-codebase.md')
  })

  test('shows only Core section when no local principles exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {},
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['principles']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('🎯 Core Principles')
    expect(output).not.toContain('🎯 Local Principles')
  })

  test('shows both Core and Local sections when both exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'local-principle.md': `# Local Principle

A local principle.

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
    expect(output).toContain('🎯 Core Principles')
    expect(output).toContain('🎯 Local Principles (.dust/principles/)')
    // Core principles
    expect(output).toContain('* enable-flow-state.md')
    // Local principles
    expect(output).toContain('* local-principle.md')
  })

  test('emits principles-listed event with local principles', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'my-principle.md': '# My Principle\n\nA local principle.',
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
          path: '.dust/principles/my-principle.md',
          title: 'My Principle',
        },
      ],
    })
  })

  test('emits empty principles-listed event when only core principles exist', async () => {
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

  test('uses slug as title for principles without title heading', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'no-title.md': 'Content without a title heading.',
          },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['principles']))

    // Event should use slug as title fallback
    expect(context.emittedEvents[0]).toEqual({
      type: 'principles-listed',
      principles: [{ path: '.dust/principles/no-title.md', title: 'no-title' }],
    })
  })

  test('handles missing emitEvent gracefully for local principles', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'local.md': '# Local Principle',
          },
        },
      },
    })

    const context = {
      cwd: '/project',
      stdout: () => {},
      stderr: () => {},
      emitEvent: undefined,
    }

    const result = await list({
      arguments: ['principles'],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    })

    expect(result.exitCode).toBe(0)
  })

  test('handles missing emitEvent gracefully for only core principles', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {},
        },
      },
    })

    const context = {
      cwd: '/project',
      stdout: () => {},
      stderr: () => {},
      emitEvent: undefined,
    }

    const result = await list({
      arguments: ['principles'],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    })

    expect(result.exitCode).toBe(0)
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

- Done
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

- Done
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

- Done
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

  test('emits ideas-listed event with expediting status when expedite task exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'my-idea.md': '# My Idea',
          },
          tasks: {
            'expedite-idea-my-idea.md': `# Expedite Idea: My Idea

Expedite this idea.

## Expedites Idea

- [My Idea](../ideas/my-idea.md)

## Blocked By

(none)

## Definition of Done

- Done
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
          status: 'expediting',
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

  test('handles missing emitEvent gracefully when listing items', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          facts: { 'fact.md': '# My Fact' },
        },
      },
    })

    const context = {
      cwd: '/project',
      stdout: () => {},
      stderr: () => {},
      emitEvent: undefined,
    }

    const result = await list({
      arguments: ['facts'],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    })

    expect(result.exitCode).toBe(0)
  })

  test('handles missing emitEvent gracefully when no items exist', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          facts: {},
        },
      },
    })

    const context = {
      cwd: '/project',
      stdout: () => {},
      stderr: () => {},
      emitEvent: undefined,
    }

    const result = await list({
      arguments: ['facts'],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    })

    expect(result.exitCode).toBe(0)
  })
})

describe('formatPrincipleEntry', () => {
  test('formats entry with slug and opening sentence', () => {
    const lines = formatPrincipleEntry('my-principle', 'This is the opening.')
    expect(lines).toEqual(['* my-principle.md', '  This is the opening.'])
  })

  test('formats entry with only slug when no opening sentence', () => {
    const lines = formatPrincipleEntry('my-principle', null)
    expect(lines).toEqual(['* my-principle.md'])
  })
})

describe('formatPrinciplesSection', () => {
  test('formats section with header and entries', () => {
    const entries = [
      { slug: 'first-principle', openingSentence: 'First opening.' },
      { slug: 'second-principle', openingSentence: 'Second opening.' },
    ]
    const lines = formatPrinciplesSection('🎯 Test Principles', entries)
    expect(lines).toEqual([
      '🎯 Test Principles',
      '',
      '* first-principle.md',
      '  First opening.',
      '',
      '* second-principle.md',
      '  Second opening.',
      '',
    ])
  })

  test('returns empty array when no entries', () => {
    const lines = formatPrinciplesSection('🎯 Test Principles', [])
    expect(lines).toEqual([])
  })

  test('handles entries without opening sentences', () => {
    const entries = [{ slug: 'my-principle', openingSentence: null }]
    const lines = formatPrinciplesSection('🎯 Test Principles', entries)
    expect(lines).toEqual(['🎯 Test Principles', '', '* my-principle.md', ''])
  })
})

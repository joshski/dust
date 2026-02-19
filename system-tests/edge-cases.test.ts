import { expect, test } from 'vitest'
import { buildPrinciple, buildTask } from './support/content-builders'
import { runSession } from './support/run-session'
import { createShellEmulator } from './support/shell-emulator'

test('empty backlog shows no tasks available', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          principles: {
            'maintainability.md': buildPrinciple({
              title: 'Maintainability',
              description: 'Code should be easy to change.',
            }),
          },
          tasks: {},
        },
      },
    },
    handlers: [
      {
        pattern: /Pick up work.*pick task/s,
        getCommand: () => 'bin/dust next',
      },
      // No tasks means empty output, match on exit
      { pattern: /^$/, getCommand: () => null },
    ],
  })

  // Agent should get an empty result when there are no tasks
  expect(session.turns[1].result.exitCode).toBe(0)
  expect(session.turns[1].result.stdout.trim()).toBe('')
})

test('no principles defined shows empty principles list', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          principles: {},
        },
      },
    },
    handlers: [
      {
        pattern: /welcome to dust/,
        getCommand: () => 'bin/dust principles',
      },
      // Empty principles directory shows "No principles found" message
      { pattern: /No principles found/, getCommand: () => null },
    ],
  })

  expect(session.turns[1].result.exitCode).toBe(0)
  expect(session.turns[1].result.stdout).toContain('No principles found')
})

test('missing .dust directory shows initialization guidance', async () => {
  const shell = await createShellEmulator({
    fileSystemTree: {
      project: {
        // No .dust directory
        'package.json': '{}',
      },
    },
  })

  const result = await shell.exec('bin/dust next')

  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('dust init')
})

test('all tasks blocked shows no available work', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          tasks: {
            'blocker-task.md': buildTask({
              title: 'Blocker Task',
            }),
            'blocked-task-a.md': buildTask({
              title: 'Blocked Task A',
              blockedBy: [{ name: 'Blocker Task', path: 'blocker-task.md' }],
            }),
            'blocked-task-b.md': buildTask({
              title: 'Blocked Task B',
              blockedBy: [{ name: 'Blocker Task', path: 'blocker-task.md' }],
            }),
          },
        },
      },
    },
    handlers: [
      {
        pattern: /Pick up work.*pick task/s,
        getCommand: () => 'bin/dust next',
      },
      // Only the unblocked task should appear
      { pattern: /Blocker Task/, getCommand: () => null },
    ],
  })

  const output = session.turns[1].result.stdout
  expect(output).toContain('Blocker Task')
  expect(output).not.toContain('Blocked Task A')
  expect(output).not.toContain('Blocked Task B')
})

test('task list handles tasks with no title gracefully', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          tasks: {
            // This is a special case - intentionally malformed markdown without H1
            'no-title.md': `No heading here, just content.

## Principles

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Done
`,
          },
        },
      },
    },
    handlers: [
      { pattern: /welcome to dust/, getCommand: () => 'bin/dust tasks' },
      { pattern: /no-title/, getCommand: () => null },
    ],
  })

  expect(session.turns[1].result.exitCode).toBe(0)
  // Should use filename as fallback
  expect(session.turns[1].result.stdout).toContain('no-title')
})

test('help command is available when confused', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {},
      },
    },
    handlers: [
      {
        pattern: /Unclear.*help/s,
        getCommand: () => 'bin/dust help',
      },
      { pattern: /Usage:/, getCommand: () => null },
    ],
  })

  expect(session.turns[1].result.exitCode).toBe(0)
  expect(session.turns[1].result.stdout).toContain('Usage:')
  expect(session.turns[1].result.stdout).toContain('dust')
})

test('list ideas handles empty ideas directory', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          ideas: {},
        },
      },
    },
    handlers: [
      { pattern: /welcome to dust/, getCommand: () => 'bin/dust ideas' },
      // Empty ideas directory shows "No ideas found" message
      { pattern: /No ideas found/, getCommand: () => null },
    ],
  })

  expect(session.turns[1].result.exitCode).toBe(0)
  expect(session.turns[1].result.stdout).toContain('No ideas found')
})

test('list facts handles empty facts directory', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          facts: {},
        },
      },
    },
    handlers: [
      { pattern: /welcome to dust/, getCommand: () => 'bin/dust facts' },
      // Empty facts directory shows "No facts found" message
      { pattern: /No facts found/, getCommand: () => null },
    ],
  })

  expect(session.turns[1].result.exitCode).toBe(0)
  expect(session.turns[1].result.stdout).toContain('No facts found')
})

test('agent handles task with special characters in filename', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          tasks: {
            'add-api-v2-endpoint.md': buildTask({
              title: 'Add API v2 Endpoint',
            }),
          },
        },
      },
    },
    handlers: [
      {
        pattern: /Pick up work.*pick task/s,
        getCommand: () => 'bin/dust next',
      },
      { pattern: /Add API v2 Endpoint/, getCommand: () => null },
    ],
  })

  expect(session.turns[1].result.stdout).toContain('Add API v2 Endpoint')
})

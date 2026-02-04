import { expect, test } from 'vitest'
import { buildTask } from './support/content-builders'
import { runSession } from './support/run-session'

test('agent sees only unblocked tasks when some are blocked', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          tasks: {
            'setup-database.md': buildTask({
              title: 'Setup Database',
              description: 'Create the database schema.',
              definitionOfDone: ['Schema created'],
            }),
            'add-user-model.md': buildTask({
              title: 'Add User Model',
              description: 'Add the user model with authentication.',
              blockedBy: [
                { name: 'Setup Database', path: 'setup-database.md' },
              ],
              definitionOfDone: ['User model created'],
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
      { pattern: /Setup Database/, getCommand: () => null },
    ],
  })

  // Only the unblocked task should be shown
  const nextOutput = session.turns[1].result.stdout
  expect(nextOutput).toContain('Setup Database')
  expect(nextOutput).not.toContain('Add User Model')
})

test('blocked task becomes available when blocker is completed', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          tasks: {
            // Only the dependent task exists - blocker was deleted
            'add-user-model.md': buildTask({
              title: 'Add User Model',
              description: 'Add the user model with authentication.',
              blockedBy: [
                { name: 'Setup Database', path: 'setup-database.md' },
              ],
              definitionOfDone: ['User model created'],
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
      { pattern: /Add User Model/, getCommand: () => null },
    ],
  })

  // Task should now be available since blocker file doesn't exist
  expect(session.turns[1].result.stdout).toContain('Add User Model')
})

test('task with multiple blockers waits for all to complete', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          tasks: {
            'setup-database.md': buildTask({
              title: 'Setup Database',
            }),
            'setup-auth.md': buildTask({
              title: 'Setup Auth',
            }),
            'add-user-api.md': buildTask({
              title: 'Add User API',
              blockedBy: [
                { name: 'Setup Database', path: 'setup-database.md' },
                { name: 'Setup Auth', path: 'setup-auth.md' },
              ],
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
      { pattern: /Setup Auth/, getCommand: () => null },
    ],
  })

  const nextOutput = session.turns[1].result.stdout
  // Only unblocked tasks should appear
  expect(nextOutput).toContain('Setup Database')
  expect(nextOutput).toContain('Setup Auth')
  expect(nextOutput).not.toContain('Add User API')
})

test('chain of blocked tasks shows only the first available', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          tasks: {
            'step-one.md': buildTask({
              title: 'Step One',
            }),
            'step-two.md': buildTask({
              title: 'Step Two',
              blockedBy: [{ name: 'Step One', path: 'step-one.md' }],
            }),
            'step-three.md': buildTask({
              title: 'Step Three',
              blockedBy: [{ name: 'Step Two', path: 'step-two.md' }],
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
      { pattern: /Step One/, getCommand: () => null },
    ],
  })

  const nextOutput = session.turns[1].result.stdout
  expect(nextOutput).toContain('Step One')
  expect(nextOutput).not.toContain('Step Two')
  expect(nextOutput).not.toContain('Step Three')
})

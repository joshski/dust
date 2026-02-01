import { expect, test } from 'vitest'
import { runSession } from '../run-session'
import { buildGoal, buildIdea, buildTask } from './content-builders'

test('check command reports error when no checks are configured', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          config: {
            'settings.json': JSON.stringify({ dustCommand: 'bin/dust' }),
          },
        },
      },
    },
    handlers: [
      { pattern: /welcome to dust/, getCommand: () => 'bin/dust check' },
      { pattern: /No checks configured/, getCommand: () => null },
    ],
  })

  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent', result: { exitCode: 0 } },
      {
        command: 'bin/dust check',
        result: {
          exitCode: 1,
          // Should report error and provide helpful instructions
          stderr: expect.stringMatching(
            /No checks configured.*settings\.json/s
          ),
        },
      },
    ],
  })
})

test('check command validates markdown files in .dust directory', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          goals: {
            'valid-goal.md': buildGoal({
              title: 'Valid Goal',
              description: 'A well-formed goal.',
            }),
          },
          tasks: {
            'valid-task.md': buildTask({
              title: 'Valid Task',
              description: 'A well-formed task.',
              definitionOfDone: ['Complete the task'],
            }),
          },
          config: {
            'settings.json': JSON.stringify({
              dustCommand: 'bin/dust',
              checks: [{ name: 'echo', command: 'echo ok' }],
            }),
          },
        },
      },
    },
    handlers: [
      { pattern: /welcome to dust/, getCommand: () => 'bin/dust check' },
      { pattern: /lint markdown/, getCommand: () => null },
    ],
  })

  // The check command runs lint markdown as a built-in check
  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent' },
      {
        command: 'bin/dust check',
        result: {
          stdout: expect.stringContaining('lint markdown'),
        },
      },
    ],
  })
})

test('check command fails when markdown files have validation errors', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          tasks: {
            // Invalid filename (uppercase) - intentionally malformed
            'InvalidTask.md': buildTask({
              title: 'Invalid Task',
              description: 'Missing required sections.',
              definitionOfDone: ['Done'],
            }),
          },
          config: {
            'settings.json': JSON.stringify({
              dustCommand: 'bin/dust',
              checks: [{ name: 'echo', command: 'echo ok' }],
            }),
          },
        },
      },
    },
    handlers: [
      { pattern: /welcome to dust/, getCommand: () => 'bin/dust check' },
      { pattern: /lint markdown/, getCommand: () => null },
    ],
  })

  // Check should fail due to invalid filename
  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent' },
      {
        command: 'bin/dust check',
        result: {
          exitCode: 1,
          stdout: expect.stringContaining('lint markdown'),
        },
      },
    ],
  })
})

test('lint markdown command shows validation errors', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          tasks: {
            // Intentionally malformed - missing required sections for testing validation errors
            'missing-sections.md':
              '# Missing Sections\n\nNo required sections here.',
          },
        },
      },
    },
    handlers: [
      {
        pattern: /welcome to dust/,
        getCommand: () => 'bin/dust lint markdown',
      },
      { pattern: /Missing required heading/, getCommand: () => null },
    ],
  })

  // Validation errors go to stderr
  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent' },
      {
        command: 'bin/dust lint markdown',
        result: {
          exitCode: 1,
          stderr: expect.stringContaining('Missing required heading'),
        },
      },
    ],
  })
})

test('lint markdown passes with valid files', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          goals: {
            'good-goal.md': buildGoal({
              title: 'Good Goal',
              description: 'This is a proper goal.',
              parentGoal: '(none)',
              subGoals: '(none)',
            }),
          },
          ideas: {
            'good-idea.md': buildIdea({
              title: 'Good Idea',
              description: 'This is a proper idea.',
            }),
          },
          tasks: {
            'good-task.md': buildTask({
              title: 'Good Task',
              description: 'A proper task with all sections.',
              goals: [{ name: 'Good Goal', path: '../goals/good-goal.md' }],
              definitionOfDone: ['Task is complete'],
            }),
          },
        },
      },
    },
    handlers: [
      {
        pattern: /welcome to dust/,
        getCommand: () => 'bin/dust lint markdown',
      },
      { pattern: /All validations passed/, getCommand: () => null },
    ],
  })

  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent' },
      {
        command: 'bin/dust lint markdown',
        result: {
          exitCode: 0,
          stdout: expect.stringContaining('All validations passed'),
        },
      },
    ],
  })
})

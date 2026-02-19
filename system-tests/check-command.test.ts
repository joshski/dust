import { expect, test } from 'vitest'
import {
  buildIdea,
  buildPrinciple,
  buildTask,
} from './support/content-builders'
import { runSession } from './support/run-session'

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
          principles: {
            'valid-principle.md': buildPrinciple({
              title: 'Valid Principle',
              description: 'A well-formed principle.',
              parentPrinciple: '(none)',
              subPrinciples: '(none)',
            }),
          },
          tasks: {
            'valid-task.md': buildTask({
              title: 'Valid Task',
              description: 'Implement a well-formed task.',
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
      { pattern: /✓ lint/, getCommand: () => null },
    ],
  })

  // The check command runs lint as a built-in check
  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent' },
      {
        command: 'bin/dust check',
        result: {
          stdout: expect.stringContaining('✓ lint'),
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
      { pattern: /✗ lint/, getCommand: () => null },
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
          stdout: expect.stringContaining('✗ lint'),
        },
      },
    ],
  })
})

test('lint command shows validation errors', async () => {
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
        getCommand: () => 'bin/dust lint',
      },
      { pattern: /Missing required heading/, getCommand: () => null },
    ],
  })

  // Validation errors go to stderr
  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent' },
      {
        command: 'bin/dust lint',
        result: {
          exitCode: 1,
          stderr: expect.stringContaining('Missing required heading'),
        },
      },
    ],
  })
})

test('lint passes with valid files', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          principles: {
            'good-principle.md': buildPrinciple({
              title: 'Good Principle',
              description: 'This is a proper principle.',
              parentPrinciple: '(none)',
              subPrinciples: '(none)',
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
              description: 'Cover all required sections for a valid task.',
              principles: [
                {
                  name: 'Good Principle',
                  path: '../principles/good-principle.md',
                },
              ],
            }),
          },
        },
      },
    },
    handlers: [
      {
        pattern: /welcome to dust/,
        getCommand: () => 'bin/dust lint',
      },
      { pattern: /All validations passed/, getCommand: () => null },
    ],
  })

  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent' },
      {
        command: 'bin/dust lint',
        result: {
          exitCode: 0,
          stdout: expect.stringContaining('All validations passed'),
        },
      },
    ],
  })
})

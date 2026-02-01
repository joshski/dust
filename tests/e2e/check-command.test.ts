import { expect, test } from 'vitest'
import { runSession } from '../run-session'

test('check command reports error when no checks are configured', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          goals: {},
          ideas: {},
          tasks: {},
          facts: {},
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
            'valid-goal.md': '# Valid Goal\n\nA well-formed goal.',
          },
          ideas: {},
          tasks: {
            'valid-task.md': `# Valid Task

A well-formed task.

## Goals

(none)

## Blocked by

(none)

## Definition of done

- [ ] Complete the task
`,
          },
          facts: {},
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
          goals: {},
          ideas: {},
          tasks: {
            // Invalid filename (uppercase)
            'InvalidTask.md': `# Invalid Task

Missing required sections.
`,
          },
          facts: {},
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
          goals: {},
          ideas: {},
          tasks: {
            'missing-sections.md':
              '# Missing Sections\n\nNo required sections here.',
          },
          facts: {},
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
            // Goals require Parent Goal and Sub-Goals sections
            'good-goal.md': `# Good Goal

This is a proper goal.

## Parent Goal

(none)

## Sub-Goals

(none)
`,
          },
          ideas: {
            'good-idea.md': '# Good Idea\n\nThis is a proper idea.',
          },
          tasks: {
            'good-task.md': `# Good Task

A proper task with all sections.

## Goals

- [Good Goal](../goals/good-goal.md)

## Blocked by

(none)

## Definition of done

- [ ] Task is complete
`,
          },
          facts: {},
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

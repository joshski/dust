import { expect, test } from 'vitest'
import { runSession } from '../run-session'

test('agent picks task from backlog and gets implementation instructions', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          goals: {
            'code-quality.md':
              '# Code Quality\n\nMaintain high code quality standards.',
          },
          ideas: {},
          tasks: {
            'add-logging.md': `# Add Logging

Add structured logging throughout the application.

## Goals

- [Code Quality](../goals/code-quality.md)

## Blocked by

(none)

## Definition of done

- [ ] Logging library is installed
- [ ] Key operations are logged
`,
          },
          facts: {},
        },
      },
    },
    handlers: [
      {
        pattern: /Pick up work.*pick task/s,
        getCommand: () => 'bin/dust pick task',
      },
      { pattern: /Pick a Task/, getCommand: () => 'bin/dust next' },
      { pattern: /Add Logging/, getCommand: () => null },
    ],
  })

  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent', result: { exitCode: 0 } },
      {
        command: 'bin/dust pick task',
        result: {
          exitCode: 0,
          stdout: expect.stringContaining('Pick a Task'),
        },
      },
      {
        command: 'bin/dust next',
        result: {
          exitCode: 0,
          stdout: expect.stringContaining('Add Logging'),
        },
      },
    ],
  })
})

test('agent can pick from multiple available tasks', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          goals: {},
          ideas: {},
          tasks: {
            'task-a.md':
              '# Task A\n\n## Goals\n\n(none)\n\n## Blocked by\n\n(none)\n\n## Definition of done\n\n- [ ] Done',
            'task-b.md':
              '# Task B\n\n## Goals\n\n(none)\n\n## Blocked by\n\n(none)\n\n## Definition of done\n\n- [ ] Done',
            'task-c.md':
              '# Task C\n\n## Goals\n\n(none)\n\n## Blocked by\n\n(none)\n\n## Definition of done\n\n- [ ] Done',
          },
          facts: {},
        },
      },
    },
    handlers: [
      {
        pattern: /Pick up work.*pick task/s,
        getCommand: () => 'bin/dust pick task',
      },
      { pattern: /Pick a Task/, getCommand: () => 'bin/dust next' },
      { pattern: /Task C/, getCommand: () => null },
    ],
  })

  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent' },
      { command: 'bin/dust pick task' },
      {
        command: 'bin/dust next',
        result: {
          stdout: expect.stringMatching(/Task A.*Task B.*Task C/s),
        },
      },
    ],
  })
})

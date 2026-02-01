import { expect, test } from 'vitest'
import { buildGoal, buildTask } from './support/content-builders'
import { runSession } from './support/run-session'

test('agent picks task from backlog and gets implementation instructions', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          goals: {
            'code-quality.md': buildGoal({
              title: 'Code Quality',
              description: 'Maintain high code quality standards.',
            }),
          },
          tasks: {
            'add-logging.md': buildTask({
              title: 'Add Logging',
              description: 'Add structured logging throughout the application.',
              goals: [
                { name: 'Code Quality', path: '../goals/code-quality.md' },
              ],
              definitionOfDone: [
                'Logging library is installed',
                'Key operations are logged',
              ],
            }),
          },
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
          tasks: {
            'task-a.md': buildTask({
              title: 'Task A',
              definitionOfDone: ['Done'],
            }),
            'task-b.md': buildTask({
              title: 'Task B',
              definitionOfDone: ['Done'],
            }),
            'task-c.md': buildTask({
              title: 'Task C',
              definitionOfDone: ['Done'],
            }),
          },
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

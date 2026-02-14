import { expect, test } from 'vitest'
import { buildGoal, buildTask } from './support/content-builders'
import { runSession } from './support/run-session'

test('agent picks task from backlog with inline task list', async () => {
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
        pattern: /Pick up work.*next/s,
        getCommand: () => 'bin/dust next',
      },
      { pattern: /Add Logging/, getCommand: () => null },
    ],
  })

  expect(session.turns).toHaveLength(2)
  expect(session.turns[0].command).toBe('bin/dust agent')
  expect(session.turns[0].result.exitCode).toBe(0)
  expect(session.turns[1].command).toBe('bin/dust next')
  expect(session.turns[1].result.exitCode).toBe(0)
  expect(session.turns[1].result.stdout).toMatch(/Next tasks/)
  expect(session.turns[1].result.stdout).toMatch(/Add Logging/)
  expect(session.turns[1].result.stdout).toMatch(/focus/)
})

test('agent can pick from multiple available tasks listed inline', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          tasks: {
            'task-a.md': buildTask({
              title: 'Task A',
            }),
            'task-b.md': buildTask({
              title: 'Task B',
            }),
            'task-c.md': buildTask({
              title: 'Task C',
            }),
          },
        },
      },
    },
    handlers: [
      {
        pattern: /Pick up work.*next/s,
        getCommand: () => 'bin/dust next',
      },
      { pattern: /Task C/, getCommand: () => null },
    ],
  })

  expect(session.turns).toHaveLength(2)
  expect(session.turns[0].command).toBe('bin/dust agent')
  expect(session.turns[1].command).toBe('bin/dust next')
  expect(session.turns[1].result.stdout).toMatch(/Task A.*Task B.*Task C/s)
})

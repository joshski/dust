import { expect, test } from 'vitest'
import { runSession } from '../run-session'
import { buildTask } from './content-builders'

test('agent lists tasks to understand current work', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          goals: {},
          ideas: {},
          tasks: {
            'task-one.md': buildTask({
              title: 'Task One',
              definitionOfDone: ['Done'],
            }),
            'task-two.md': buildTask({
              title: 'Task Two',
              definitionOfDone: ['Done'],
            }),
          },
          facts: {},
        },
      },
    },
    handlers: [
      { pattern: /welcome to dust/, getCommand: () => 'bin/dust list tasks' },
      { pattern: /task-two/, getCommand: () => null },
    ],
  })

  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent' },
      {
        command: 'bin/dust list tasks',
        result: { stdout: expect.stringMatching(/task-one.*task-two/s) },
      },
    ],
  })
})

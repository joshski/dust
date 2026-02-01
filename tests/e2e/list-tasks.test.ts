import { expect, test } from 'vitest'
import { runSession } from '../run-session'

test('agent lists tasks to understand current work', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          goals: {},
          ideas: {},
          tasks: {
            'task-one.md':
              '# Task One\n\n## Goals\n\n(none)\n\n## Blocked by\n\n(none)\n\n## Definition of done\n\n- [ ] Done',
            'task-two.md':
              '# Task Two\n\n## Goals\n\n(none)\n\n## Blocked by\n\n(none)\n\n## Definition of done\n\n- [ ] Done',
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

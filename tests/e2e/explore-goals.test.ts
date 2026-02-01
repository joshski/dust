import { expect, test } from 'vitest'
import { runSession } from '../run-session'

test('agent explores goals to understand project direction', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          goals: {
            'fast-feedback.md': '# Fast Feedback\n\nTests should run quickly.',
            'maintainability.md':
              '# Maintainability\n\nCode should be easy to change.',
          },
          ideas: {},
          tasks: {},
          facts: {},
        },
      },
    },
    handlers: [
      { pattern: /welcome to dust/, getCommand: () => 'bin/dust list goals' },
      { pattern: /maintainability/, getCommand: () => null },
    ],
  })

  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent' },
      {
        command: 'bin/dust list goals',
        result: {
          stdout: expect.stringMatching(/fast-feedback.*maintainability/s),
        },
      },
    ],
  })
})

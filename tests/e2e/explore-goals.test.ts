import { expect, test } from 'vitest'
import { runSession } from '../run-session'
import { buildGoal } from './content-builders'

test('agent explores goals to understand project direction', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          goals: {
            'fast-feedback.md': buildGoal({
              title: 'Fast Feedback',
              description: 'Tests should run quickly.',
            }),
            'maintainability.md': buildGoal({
              title: 'Maintainability',
              description: 'Code should be easy to change.',
            }),
          },
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

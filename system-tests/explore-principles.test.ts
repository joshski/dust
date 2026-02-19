import { expect, test } from 'vitest'
import { buildPrinciple } from './support/content-builders'
import { runSession } from './support/run-session'

test('agent explores principles to understand project direction', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          principles: {
            'fast-feedback.md': buildPrinciple({
              title: 'Fast Feedback',
              description: 'Tests should run quickly.',
            }),
            'maintainability.md': buildPrinciple({
              title: 'Maintainability',
              description: 'Code should be easy to change.',
            }),
          },
        },
      },
    },
    handlers: [
      { pattern: /welcome to dust/, getCommand: () => 'bin/dust principles' },
      { pattern: /maintainability/, getCommand: () => null },
    ],
  })

  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent' },
      {
        command: 'bin/dust principles',
        result: {
          stdout: expect.stringMatching(/fast-feedback.*maintainability/s),
        },
      },
    ],
  })
})

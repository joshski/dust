import { expect, test } from 'vitest'
import { buildPrinciple, buildTask } from './support/content-builders'
import { runSession } from './support/run-session'

test('agent discovers available work through dust agent flow', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          principles: {
            'fast-feedback.md': buildPrinciple({
              title: 'Fast Feedback',
              description: 'Tests should run quickly.',
            }),
          },
          tasks: {
            'implement-caching.md': buildTask({
              title: 'Implement Caching',
              description: 'Add caching to improve performance.',
              principles: [
                {
                  name: 'Fast Feedback',
                  path: '../principles/fast-feedback.md',
                },
              ],
              definitionOfDone: ['Cache is implemented', 'Tests pass'],
            }),
          },
        },
      },
    },
    handlers: [
      {
        pattern: /Pick up work.*pick task/s,
        getCommand: () => 'bin/dust next',
      },
      { pattern: /Implement Caching/, getCommand: () => null },
    ],
  })

  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent', result: { exitCode: 0 } },
      {
        command: 'bin/dust next',
        result: {
          exitCode: 0,
          stdout: expect.stringContaining('Implement Caching'),
        },
      },
    ],
  })
})

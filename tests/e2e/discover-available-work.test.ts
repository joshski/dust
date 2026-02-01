import { expect, test } from 'vitest'
import { runSession } from '../run-session'

test('agent discovers available work through dust agent flow', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          goals: {
            'fast-feedback.md': '# Fast Feedback\n\nTests should run quickly.',
          },
          ideas: {},
          tasks: {
            'implement-caching.md': `# Implement Caching

Add caching to improve performance.

## Goals

- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- [ ] Cache is implemented
- [ ] Tests pass
`,
          },
          facts: {},
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

import { expect, test } from 'vitest'
import { buildIdea, buildPrinciple } from './support/content-builders'
import { runSession } from './support/run-session'

test('agent gets instructions for creating a new task', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {},
      },
    },
    handlers: [
      {
        pattern: /Capture a new task.*new task/s,
        getCommand: () => 'bin/dust new task',
      },
      { pattern: /Adding a New Task/, getCommand: () => null },
    ],
  })

  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent', result: { exitCode: 0 } },
      {
        command: 'bin/dust new task',
        result: {
          exitCode: 0,
          // Verify the instructions include key steps
          stdout: expect.stringMatching(
            /Adding a New Task.*\.dust\/tasks\/.*Definition of Done/s
          ),
        },
      },
    ],
  })
})

test('agent gets instructions for creating a new principle', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {},
      },
    },
    handlers: [
      {
        pattern: /Capture a new principle.*new principle/s,
        getCommand: () => 'bin/dust new principle',
      },
      { pattern: /Adding a New Principle/, getCommand: () => null },
    ],
  })

  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent', result: { exitCode: 0 } },
      {
        command: 'bin/dust new principle',
        result: {
          exitCode: 0,
          // Verify the instructions include key guidance
          stdout: expect.stringMatching(
            /Adding a New Principle.*\.dust\/principles\/.*Stable/s
          ),
        },
      },
    ],
  })
})

test('agent gets instructions for creating a new idea', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {},
      },
    },
    handlers: [
      {
        pattern: /Capture a vague idea.*new idea/s,
        getCommand: () => 'bin/dust new idea',
      },
      { pattern: /Adding a New Idea/, getCommand: () => null },
    ],
  })

  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent', result: { exitCode: 0 } },
      {
        command: 'bin/dust new idea',
        result: {
          exitCode: 0,
          // Verify the instructions include key guidance
          stdout: expect.stringMatching(/Adding a New Idea.*\.dust\/ideas\//s),
        },
      },
    ],
  })
})

test('new task instructions include checking existing ideas', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          ideas: {
            'improve-performance.md': buildIdea({
              title: 'Improve Performance',
              description: 'Make it faster.',
            }),
          },
        },
      },
    },
    handlers: [
      {
        pattern: /Capture a new task.*new task/s,
        getCommand: () => 'bin/dust new task',
      },
      { pattern: /dust ideas/, getCommand: () => null },
    ],
  })

  // Instructions should mention checking existing ideas
  const output = session.turns[1].result.stdout
  expect(output).toContain('dust ideas')
})

test('new principle instructions include checking existing principles', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          principles: {
            'maintainability.md': buildPrinciple({
              title: 'Maintainability',
              description: 'Code should be easy to change.',
            }),
          },
        },
      },
    },
    handlers: [
      {
        pattern: /Capture a new principle.*new principle/s,
        getCommand: () => 'bin/dust new principle',
      },
      { pattern: /dust principles/, getCommand: () => null },
    ],
  })

  // Instructions should mention checking existing principles
  const output = session.turns[1].result.stdout
  expect(output).toContain('dust principles')
})

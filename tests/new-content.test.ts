import { expect, test } from 'vitest'
import { buildGoal, buildIdea } from './support/content-builders'
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

test('agent gets instructions for creating a new goal', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {},
      },
    },
    handlers: [
      {
        pattern: /Capture a new goal.*new goal/s,
        getCommand: () => 'bin/dust new goal',
      },
      { pattern: /Adding a New Goal/, getCommand: () => null },
    ],
  })

  expect(session).toMatchObject({
    turns: [
      { command: 'bin/dust agent', result: { exitCode: 0 } },
      {
        command: 'bin/dust new goal',
        result: {
          exitCode: 0,
          // Verify the instructions include key guidance
          stdout: expect.stringMatching(
            /Adding a New Goal.*\.dust\/goals\/.*Stable/s
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
      { pattern: /list ideas/, getCommand: () => null },
    ],
  })

  // Instructions should mention checking existing ideas
  const output = session.turns[1].result.stdout
  expect(output).toContain('list ideas')
})

test('new goal instructions include checking existing goals', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          goals: {
            'maintainability.md': buildGoal({
              title: 'Maintainability',
              description: 'Code should be easy to change.',
            }),
          },
        },
      },
    },
    handlers: [
      {
        pattern: /Capture a new goal.*new goal/s,
        getCommand: () => 'bin/dust new goal',
      },
      { pattern: /list goals/, getCommand: () => null },
    ],
  })

  // Instructions should mention checking existing goals
  const output = session.turns[1].result.stdout
  expect(output).toContain('list goals')
})

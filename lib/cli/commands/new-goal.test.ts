import { afterEach, describe, expect, test } from 'vitest'
import {
  createCommandDependencies,
  restoreEnv,
  stubEnv,
} from '../../test/test-utilities'
import { newGoal } from './new-goal'

describe('new-goal', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('outputs goal creation instructions', async () => {
    const { context, dependencies } = createCommandDependencies()
    const result = await newGoal(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Adding a New Goal')
    expect(context.stdoutLines.join('\n')).toContain('Follow these steps:')
  })

  test('uses todo list phrasing for Claude Code Web', async () => {
    stubEnv('CLAUDECODE', '1')
    stubEnv('CLAUDE_CODE_REMOTE', 'true')
    const { context, dependencies } = createCommandDependencies()
    const result = await newGoal(dependencies)

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('Use a todo list to track your progress')
  })
})

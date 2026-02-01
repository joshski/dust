import { describe, expect, test } from 'vitest'
import { createCommandDependencies } from '../../test/test-utilities'
import { newGoal } from './new-goal'

describe('new-goal', () => {
  test('outputs goal creation instructions', async () => {
    const { context, dependencies } = createCommandDependencies()
    const result = await newGoal(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Adding a New Goal')
  })
})

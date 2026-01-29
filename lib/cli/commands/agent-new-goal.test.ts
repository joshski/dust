import { describe, expect, test } from 'vitest'
import { createCommandDependencies } from '../test-utilities'
import { agentNewGoal } from './agent-new-goal'

describe('agent-new-goal', () => {
  test('outputs goal creation instructions', async () => {
    const { context, dependencies } = createCommandDependencies()
    const result = await agentNewGoal(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Adding a New Goal')
  })
})

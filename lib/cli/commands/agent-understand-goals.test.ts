import { describe, expect, test } from 'vitest'
import { createCommandDependencies } from '../test-utilities'
import { agentUnderstandGoals } from './agent-understand-goals'

describe('agent-understand-goals', () => {
  test('outputs goals understanding instructions', async () => {
    const { context, dependencies } = createCommandDependencies()
    const result = await agentUnderstandGoals(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Understanding Goals')
  })
})

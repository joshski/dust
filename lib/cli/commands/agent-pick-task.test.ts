import { describe, expect, test } from 'vitest'
import { createCommandDependencies } from '../test-utilities'
import { agentPickTask } from './agent-pick-task'

describe('agent-pick-task', () => {
  test('outputs pick task instructions', async () => {
    const { context, dependencies } = createCommandDependencies()
    const result = await agentPickTask(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Pick a Task')
  })
})

import { describe, expect, test } from 'vitest'
import { createCommandDependencies } from '../test-utilities'
import { agentImplementTask } from './agent-implement-task'

describe('agent-implement-task', () => {
  test('outputs implementation instructions', async () => {
    const { context, dependencies } = createCommandDependencies()
    const result = await agentImplementTask(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Implement a Task')
  })
})

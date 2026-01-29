import { describe, expect, test } from 'vitest'
import { createCommandDependencies } from '../test-utilities'
import { agentNewTask } from './agent-new-task'

describe('agent-new-task', () => {
  test('outputs task creation instructions', async () => {
    const { context, dependencies } = createCommandDependencies()
    const result = await agentNewTask(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Adding a New Task')
  })
})

import { describe, expect, test } from 'vitest'
import { createCommandDependencies } from '../../test/test-utilities'
import { newTask } from './new-task'

describe('new-task', () => {
  test('outputs task creation instructions', async () => {
    const { context, dependencies } = createCommandDependencies()
    const result = await newTask(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Adding a New Task')
  })
})

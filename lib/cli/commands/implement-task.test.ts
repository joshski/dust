import { describe, expect, test } from 'vitest'
import { createCommandDependencies } from '../../test/test-utilities'
import { implementTask } from './implement-task'

describe('implement-task', () => {
  test('redirects to focus command', async () => {
    const { context, dependencies } = createCommandDependencies()
    const result = await implementTask(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('dust focus')
  })
})

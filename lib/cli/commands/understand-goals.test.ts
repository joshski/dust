import { describe, expect, test } from 'vitest'
import { createCommandDependencies } from '../../test/test-utilities'
import { understandGoals } from './understand-goals'

describe('understand-goals', () => {
  test('outputs goals understanding instructions', async () => {
    const { context, dependencies } = createCommandDependencies()
    const result = await understandGoals(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Understanding Goals')
  })
})

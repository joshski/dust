import { describe, expect, test } from 'vitest'
import { createCommandDependencies } from '../../test-support/test-utilities'
import { newIdea } from './new-idea'

describe('new-idea', () => {
  test('outputs idea creation instructions', async () => {
    const { context, dependencies } = createCommandDependencies()
    const result = await newIdea(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Adding a New Idea')
  })
})

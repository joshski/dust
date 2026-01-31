import { describe, expect, test } from 'vitest'
import { createCommandDependencies } from '../../test/test-utilities'
import { agentNewIdea } from './agent-new-idea'

describe('agent-new-idea', () => {
  test('outputs idea creation instructions', async () => {
    const { context, dependencies } = createCommandDependencies()
    const result = await agentNewIdea(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Adding a New Idea')
  })
})

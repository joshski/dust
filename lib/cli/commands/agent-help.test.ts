import { describe, expect, test } from 'vitest'
import { createCommandDependencies } from '../test-utilities'
import { agentHelp } from './agent-help'

describe('agent-help', () => {
  test('outputs agent help text', async () => {
    const { context, dependencies } = createCommandDependencies()
    const result = await agentHelp(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Dust Agent Guide')
  })
})

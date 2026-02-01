import { describe, expect, test } from 'vitest'
import { createCommandDependencies } from '../../test/test-utilities'
import { subagentTask } from './subagent-task'

describe('subagent-task', () => {
  test('outputs task creation instructions', async () => {
    const { context, dependencies } = createCommandDependencies()
    const result = await subagentTask(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Adding a New Task')
  })

  test('does not contain sub-agent recursion instructions', async () => {
    const { context, dependencies } = createCommandDependencies()
    await subagentTask(dependencies)

    const output = context.stdoutLines.join('\n')
    expect(output).not.toContain('Start a sub-agent')
    expect(output).not.toContain('isClaudeCodeWeb')
  })
})

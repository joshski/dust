import { describe, expect, test } from 'vitest'
import { createCommandDependencies } from '../../test/test-utilities'
import { subagentNewTask } from './subagent-new-task'

describe('subagent-new-task', () => {
  test('outputs task creation instructions', async () => {
    const { context, dependencies } = createCommandDependencies()
    const result = await subagentNewTask(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Adding a New Task')
  })

  test('does not contain sub-agent recursion instructions', async () => {
    const { context, dependencies } = createCommandDependencies()
    await subagentNewTask(dependencies)

    const output = context.stdoutLines.join('\n')
    expect(output).not.toContain('Start a sub-agent')
    expect(output).not.toContain('isClaudeCodeWeb')
  })
})

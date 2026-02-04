import { afterEach, describe, expect, test } from 'vitest'
import {
  createCommandDependencies,
  restoreEnv,
  stubEnv,
} from '../../test/test-utilities'
import { newTask } from './new-task'

describe('new-task', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('outputs task creation instructions', async () => {
    const { context, dependencies } = createCommandDependencies()
    const result = await newTask(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Adding a New Task')
  })

  test('renders full content correctly for Claude Code Web', async () => {
    stubEnv('CLAUDECODE', '1')
    stubEnv('CLAUDE_CODE_ENTRYPOINT', 'remote')
    const { context, dependencies } = createCommandDependencies()
    const result = await newTask(dependencies)

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')

    // Assert full content to catch any stray text or formatting issues
    expect(output).toBe(`## Adding a New Task

Follow these steps to create the task definition, then spawn a sub-agent for implementation.

Use a todo list to track your progress through these steps.

1. Run \`dust list ideas\` to see all existing ideas
2. Determine which ideas (if any) should be:
   - **Deleted** - if the new task fully covers the idea
   - **Updated** - if the idea's scope changes as a result of the task
3. Research thoroughly to ensure the task will be clearly defined:
   - Explore the codebase to understand existing patterns and relevant files
   - Identify exactly which files need to change and how
   - Resolve any ambiguities in the requirements before writing the task
   - Gather specific technical details (function names, file paths, data structures)
   - The goal is a task description with minimal ambiguity at implementation time
4. Create a new markdown file in \`.dust/tasks/\` with a descriptive kebab-case name (e.g., \`add-user-authentication.md\`)
5. Add a title as the first line using an H1 heading (e.g., \`# Add user authentication\`)
6. Write a comprehensive description of what needs to be done with technical details and references to relevant files
7. Add a \`## Goals\` section with links to relevant goals this task supports (e.g., \`- [Goal Name](../goals/goal-name.md)\`)
8. Add a \`## Blocked By\` section listing any tasks that must complete first, or \`(none)\` if there are no blockers
9. Add a \`## Definition of Done\` section with a checklist of completion criteria using \`- [ ]\` for each item
10. Run \`dust lint markdown\` to catch any issues with the task format
11. Create a single atomic commit with a message in the format "Add task: <title>" that includes:
    - The new task file
    - Deletion of any ideas that were fully realized
    - Updates to any ideas whose scope changed
12. **Start a sub-agent** to implement the task: "Run \`dust agent implement task\` and implement the task in \`.dust/tasks/[task-file].md\`"
`)

    // Verify no stray template syntax or formatting issues
    expect(output).not.toContain('{{else}}')
    expect(output).not.toContain('{{/if}}')
    expect(output).not.toContain('{{#if')
    expect(output).not.toContain('{{#unless')
    expect(output).not.toContain('{{/unless}}')
    expect(output).not.toContain('Push your commit')
  })
})

/**
 * dust new task - Task creation instructions
 *
 * Displays guidance for creating new tasks.
 */

import type { CommandDependencies, CommandResult } from '../types'
import {
  manageGitHooks,
  type TemplateVars,
  templateVariables,
} from './agent-shared'

function newTaskInstructions(vars: TemplateVars): string {
  const steps: string[] = []

  steps.push('## Adding a New Task')
  steps.push('')

  if (vars.isClaudeCodeWeb) {
    steps.push(
      'Follow these steps to create the task definition, then spawn a sub-agent for implementation.'
    )
    steps.push('')
    steps.push('Use a todo list to track your progress through these steps.')
  } else {
    steps.push('Follow these steps:')
  }

  steps.push('')
  steps.push(`1. Run \`${vars.bin} ideas\` to see all existing ideas`)
  steps.push('2. Determine which ideas (if any) should be:')
  steps.push('   - **Deleted** - if the new task fully covers the idea')
  steps.push(
    "   - **Updated** - if the idea's scope changes as a result of the task"
  )
  steps.push(
    '3. Research thoroughly to ensure the task will be clearly defined:'
  )
  steps.push(
    '   - Explore the codebase to understand existing patterns and relevant files'
  )
  steps.push('   - Identify exactly which files need to change and how')
  steps.push(
    '   - Resolve any ambiguities in the requirements before writing the task'
  )
  steps.push(
    '   - Gather specific technical details (function names, file paths, data structures)'
  )
  steps.push(
    '   - The goal is a task description with minimal ambiguity at implementation time'
  )
  steps.push(
    '4. Create a new markdown file in `.dust/tasks/` with a descriptive kebab-case name (e.g., `add-user-authentication.md`)'
  )
  steps.push(
    '5. Add a title as the first line using an H1 heading (e.g., `# Add user authentication`)'
  )
  steps.push(
    '6. Write a comprehensive description starting with an imperative opening sentence (e.g., "Add caching to the API layer." not "This task adds caching."). Include technical details and references to relevant files.'
  )
  steps.push(
    '7. Add a `## Goals` section with links to relevant goals this task supports (e.g., `- [Goal Name](../goals/goal-name.md)`)'
  )
  steps.push(
    '8. Add a `## Blocked By` section listing any tasks that must complete first, or `(none)` if there are no blockers'
  )
  steps.push(
    '9. Add a `## Definition of Done` section with a checklist of completion criteria using `- [ ]` for each item'
  )
  steps.push(
    `10. Run \`${vars.bin} lint\` to catch any issues with the task format`
  )
  steps.push(
    '11. Create a single atomic commit with a message in the format "Add task: <title>" that includes:'
  )
  steps.push('    - The new task file')

  steps.push(
    '    - Deletion of the idea file that spawned this task (if remaining scope exists, create new ideas for it)'
  )

  if (vars.isClaudeCodeWeb) {
    steps.push(
      `12. **Start a sub-agent** to implement the task: "Run \`${vars.bin} implement task\` and implement the task in \`.dust/tasks/[task-file].md\`"`
    )
  } else {
    steps.push('12. Push your commit to the remote repository')
  }

  return steps.join('\n')
}

export async function newTask(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, settings } = dependencies
  const hooksInstalled = await manageGitHooks(dependencies)
  const vars = templateVariables(settings, hooksInstalled)
  context.stdout(newTaskInstructions(vars))
  return { exitCode: 0 }
}

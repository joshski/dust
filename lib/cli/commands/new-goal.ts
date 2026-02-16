/**
 * dust new goal - Goal creation instructions
 *
 * Displays guidance for creating new goals.
 */

import { dedent } from '../dedent'
import type { CommandDependencies, CommandResult } from '../types'
import {
  manageGitHooks,
  type TemplateVars,
  templateVariables,
} from './agent-shared'

function newGoalInstructions(vars: TemplateVars): string {
  const intro = vars.isClaudeCodeWeb
    ? 'Follow these steps. Use a todo list to track your progress.'
    : 'Follow these steps:'

  return dedent`
    ## Adding a New Goal

    Goals are guiding principles that persist across tasks. They define the "why" behind the work.

    ${intro}
    1. Run \`${vars.bin} goals\` to see existing goals and avoid duplication
    2. Create a new markdown file in \`.dust/goals/\` with a descriptive kebab-case name (e.g., \`cross-platform-support.md\`)
    3. Add a title as the first line using an H1 heading (e.g., \`# Cross-platform support\`)
    4. Write a clear description explaining:
       - What this goal means in practice
       - Why it matters for the project
       - How to evaluate whether work supports this goal
    5. Run \`${vars.bin} lint\` to catch any formatting issues
    6. Create a single atomic commit with a message in the format "Add goal: <title>"
    7. Push your commit to the remote repository

    Goals should be:
    - **Stable** - They rarely change once established
    - **Actionable** - Tasks can be linked to them
    - **Clear** - Anyone reading should understand what it means
  `
}

export async function newGoal(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, settings } = dependencies
  const hooksInstalled = await manageGitHooks(dependencies)
  const vars = templateVariables(settings, hooksInstalled)
  context.stdout(newGoalInstructions(vars))
  return { exitCode: 0 }
}

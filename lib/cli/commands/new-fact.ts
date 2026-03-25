/**
 * dust new fact - Fact creation instructions
 *
 * Displays guidance for creating new facts.
 */

import { dedent } from '../dedent'
import type { CommandDependencies, CommandResult } from '../types'
import {
  manageGitHooks,
  type TemplateVars,
  templateVariables,
} from '../shared/agent-shared'

function newFactInstructions(vars: TemplateVars): string {
  const intro = vars.isClaudeCodeWeb
    ? 'Follow these steps. Use a todo list to track your progress.'
    : 'Follow these steps:'

  return dedent`
    ## Adding a New Fact

    Facts are current state documentation. They capture how things work today—implementation details, architectural decisions, and system behavior. Unlike principles (which are aspirational) or ideas/tasks (which are future work), facts answer "how does this work today?"

    ${intro}
    1. Run \`${vars.bin} facts\` to see existing facts and avoid duplication
    2. Create a new markdown file in \`.dust/facts/\` with a descriptive kebab-case name (e.g., \`authentication-flow.md\`)
    3. Add a title as the first line using an H1 heading (e.g., \`# Authentication Flow\`)
    4. Write an opening sentence that summarizes the fact (this appears in \`${vars.bin} facts\` output)
    5. Add optional body sections with additional details, examples, or context
    6. Run \`${vars.bin} lint\` to catch any formatting issues
    7. Create a single atomic commit with a message in the format "Add fact: <title>"
    8. Push your commit to the remote repository

    Facts should be:
    - **Current** - They describe how things work today, not how they should work
    - **Specific** - They document concrete implementation details
    - **Discoverable** - The opening sentence should help others find relevant facts
  `
}

export async function newFact(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, settings } = dependencies
  const hooksInstalled = await manageGitHooks(dependencies)
  const vars = templateVariables(settings, hooksInstalled, process.env)
  context.stdout(newFactInstructions(vars))
  return { exitCode: 0 }
}

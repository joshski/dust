/**
 * dust focus - Declare current objective and show implementation instructions
 *
 * Outputs the current focus/objective to stdout, followed by implementation
 * instructions (check, implement, commit, push).
 *
 * Usage: dust focus "add login box"
 */

import type { CommandDependencies, CommandResult } from '../types'
import { manageGitHooks, templateVariables } from './agent-shared'

export async function focus(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, settings } = dependencies

  // Parse objective from arguments
  const objective = dependencies.arguments.join(' ').trim()

  if (!objective) {
    context.stderr('Error: No objective provided')
    context.stderr('Usage: dust focus "your objective here"')
    return { exitCode: 1 }
  }

  const hooksInstalled = await manageGitHooks(dependencies)
  const vars = templateVariables(settings, hooksInstalled)

  // Output confirmation
  context.stdout(`🎯 Focus: ${objective}`)
  context.stdout('')

  // Implementation instructions
  const steps: string[] = []
  let step = 1

  steps.push(
    `${step}. Run \`${vars.bin} check\` to verify the project is in a good state`
  )
  step++

  steps.push(`${step}. Implement the task`)
  step++

  if (!hooksInstalled) {
    steps.push(`${step}. Run \`${vars.bin} check\` before committing`)
    step++
  }

  steps.push(
    `${step}. Create a single atomic commit that includes:`,
    '   - All implementation changes',
    '   - Deletion of the completed task file',
    '   - Updates to any facts that changed',
    '   - Deletion of any ideas that were fully realized',
    '',
    '   Use the task title as the commit message. Task titles are written in imperative form, which is the recommended style for git commit messages. Do not add prefixes like "Complete task:" - use the title directly.',
    '',
    '   Example: If the task title is "Add validation for user input", the commit message should be:',
    '   ```',
    '   Add validation for user input',
    '   ```',
    ''
  )
  step++

  steps.push(`${step}. Push your commit to the remote repository`)

  steps.push('')
  steps.push('Keep your change small and focused. One task, one commit.')

  context.stdout(steps.join('\n'))

  return { exitCode: 0 }
}

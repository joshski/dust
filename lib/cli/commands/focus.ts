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

export function buildImplementationInstructions(
  bin: string,
  hooksInstalled: boolean,
  taskTitle?: string
): string {
  const steps: string[] = []
  let step = 1

  steps.push(`Note: Do NOT run \`${bin} agent\`.`, '')

  steps.push(
    `${step}. Run \`${bin} check\` to verify the project is in a good state`
  )
  step++

  steps.push(`${step}. Implement the task`)
  step++

  if (!hooksInstalled) {
    steps.push(`${step}. Run \`${bin} check\` before committing`)
    step++
  }

  const commitMessageLine = taskTitle
    ? `   Use this exact commit message: "${taskTitle}". Do not add any prefix.`
    : '   Use the task title as the commit message. Do not add prefixes like "Complete task:" - use the title directly.'

  steps.push(
    `${step}. Create a single atomic commit that includes:`,
    '   - All implementation changes',
    '   - Deletion of the completed task file',
    '   - Updates to any facts that changed',
    '   - Deletion of the idea file that spawned this task (if remaining scope exists, create new ideas for it)',
    '',
    commitMessageLine,
    ''
  )
  step++

  steps.push(`${step}. Push your commit to the remote repository`)

  steps.push('')
  steps.push('Keep your change small and focused. One task, one commit.')

  return steps.join('\n')
}

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

  context.stdout(buildImplementationInstructions(vars.bin, hooksInstalled))

  return { exitCode: 0 }
}

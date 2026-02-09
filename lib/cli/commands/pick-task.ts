/**
 * dust pick task - Pick a task from the backlog
 *
 * Lists unblocked tasks inline and instructs the agent to read one
 * and then run `focus` to start working on it.
 */

import type { CommandDependencies, CommandResult } from '../types'
import { manageGitHooks, templateVariables } from './agent-shared'
import { findUnblockedTasks, printTaskList } from './next'

export async function pickTask(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, fileSystem, settings } = dependencies

  await manageGitHooks(dependencies)

  const result = await findUnblockedTasks(context.cwd, fileSystem)

  if (result.error) {
    context.stderr(`Error: ${result.error}`)
    context.stderr("Run 'dust init' to initialize a Dust repository")
    return { exitCode: 1 }
  }

  if (result.tasks.length === 0) {
    context.stdout('No unblocked tasks found.')
    return { exitCode: 0 }
  }

  context.stdout('## Pick a Task')
  context.stdout('')

  printTaskList(context, result.tasks)

  const vars = templateVariables(settings, false)
  context.stdout(
    `Pick ONE task, read its file to understand the requirements, then run \`${vars.bin} focus "<task name>"\`.`
  )

  return { exitCode: 0 }
}

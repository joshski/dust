/**
 * Main entry point for dust CLI
 *
 * This module contains all the command routing, help text, and adapter setup
 * so that bin/dust can be minimal.
 *
 * Command resolution works by joining arguments with hyphens and looking up in the registry.
 * For example, `dust agent new task` resolves to `agent-new-task` in the registry.
 */

import { loadSettings } from '../config/settings'
import { agent } from './commands/agent'
import { agentHelp } from './commands/agent-help'
import { agentImplementTask } from './commands/agent-implement-task'
import { agentNewGoal } from './commands/agent-new-goal'
import { agentNewIdea } from './commands/agent-new-idea'
import { agentNewTask } from './commands/agent-new-task'
import { agentPickTask } from './commands/agent-pick-task'
import { agentUnderstandGoals } from './commands/agent-understand-goals'
import { check } from './commands/check'
import { generateHelpText, help } from './commands/help'
import { init } from './commands/init'
import { lintMarkdown } from './commands/lint-markdown'
import { list } from './commands/list'
import { loopClaude } from './commands/loop'
import { next } from './commands/next'
import { prePush } from './commands/pre-push'
import { facts, goals, ideas, tasks } from './commands/type-list'
import type {
  CommandContext,
  CommandDependencies,
  CommandResult,
  FileSystem,
  GlobScanner,
} from './types'

/**
 * Command registry maps hyphenated command names to their handler functions.
 * Adding a new command only requires adding an entry here.
 *
 * Command names use hyphens to join verb-noun patterns:
 * - `dust agent new task` -> `agent-new-task`
 * - `dust pre-push` -> `pre-push`
 */
export const commandRegistry = {
  init,
  'lint-markdown': lintMarkdown,
  list,
  tasks,
  goals,
  ideas,
  facts,
  next,
  check,
  agent,
  'agent-help': agentHelp,
  'agent-new-task': agentNewTask,
  'agent-new-goal': agentNewGoal,
  'agent-new-idea': agentNewIdea,
  'agent-implement-task': agentImplementTask,
  'agent-pick-task': agentPickTask,
  'agent-understand-goals': agentUnderstandGoals,
  'loop-claude': loopClaude,
  'pre-push': prePush,
  help,
}

export type Command = keyof typeof commandRegistry

// Top-level commands shown in help (excludes hyphenated subcommands)
export const COMMANDS = Object.keys(commandRegistry).filter(
  cmd => !cmd.includes('-')
) as Command[]

// Re-export for backward compatibility
export { generateHelpText }

// Default help text for backward compatibility in tests
export const HELP_TEXT = generateHelpText({ dustCommand: 'dust' })

export interface MainOptions {
  commandArguments: string[]
  context: CommandContext
  fileSystem: FileSystem
  glob: GlobScanner
}

export function isHelpRequest(command: string | undefined): boolean {
  return (
    !command || command === 'help' || command === '--help' || command === '-h'
  )
}

export function isValidCommand(command: string): command is Command {
  return command in commandRegistry
}

export async function runCommand(
  command: Command,
  dependencies: CommandDependencies
): Promise<CommandResult> {
  return commandRegistry[command](dependencies)
}

/**
 * Resolves command arguments to a hyphenated command name.
 * Tries progressively longer command chains until it finds a match.
 *
 * For example, with commandArguments ['agent', 'new', 'task', 'extra']:
 * - Tries 'agent-new-task-extra' -> not found
 * - Tries 'agent-new-task' -> found! Returns { command: 'agent-new-task', remaining: ['extra'] }
 */
function resolveCommand(commandArguments: string[]): {
  command: string | null
  remaining: string[]
} {
  // Try progressively shorter command chains
  for (let i = commandArguments.length; i > 0; i--) {
    const candidate = commandArguments.slice(0, i).join('-')
    if (candidate in commandRegistry) {
      return { command: candidate, remaining: commandArguments.slice(i) }
    }
  }

  return { command: null, remaining: commandArguments }
}

export async function main(options: MainOptions): Promise<CommandResult> {
  const { commandArguments, context, fileSystem, glob } = options

  const settings = await loadSettings(context.cwd, fileSystem)
  const helpText = generateHelpText(settings)

  if (isHelpRequest(commandArguments[0])) {
    context.stdout(helpText)
    return { exitCode: 0 }
  }

  const { command, remaining } = resolveCommand(commandArguments)

  if (!command || !isValidCommand(command)) {
    context.stderr(`Unknown command: ${commandArguments.join(' ')}`)
    context.stderr(`Run '${settings.dustCommand} help' for available commands`)
    return { exitCode: 1 }
  }

  const dependencies: CommandDependencies = {
    arguments: remaining,
    context,
    fileSystem,
    globScanner: glob,
    settings,
  }

  return runCommand(command, dependencies)
}

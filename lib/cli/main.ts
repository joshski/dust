/**
 * Main entry point for dust CLI
 *
 * This module contains all the command routing, help text, and adapter setup
 * so that bin/dust can be minimal.
 *
 * Command resolution works by joining arguments with spaces and looking up in the registry.
 * For example, `dust agent new task` resolves to `agent new task` in the registry.
 */

import { loadSettings } from '../config/settings'
import type { RuntimeConfig } from '../env-config'
import { DUST_VERSION } from '../version'
import { agent } from './commands/agent'
import { audit } from './commands/audit'
import { bucketWorker } from './commands/bucket-worker'
import { bucketTool } from './commands/bucket-tool'
import { check } from './commands/check'
import { focus } from './commands/focus'
import { generateHelpText, help } from './commands/help'
import { implementTask } from './commands/implement-task'
import { init } from './commands/init'
import { lintMarkdown } from './commands/lint-markdown'
import { list } from './commands/list'
import { loopClaude } from './commands/loop-claude'
import { loopCodex } from './commands/loop-codex'
import { migrate } from './commands/migrate'
import { newIdea } from './commands/new-idea'
import { newPrinciple } from './commands/new-principle'
import { newTask } from './commands/new-task'
import { next } from './commands/next'
import { pickTask } from './commands/pick-task'
import { prePush } from './commands/pre-push'
import { facts, ideas, principles, tasks } from './shared/type-list'
import type {
  CommandContext,
  CommandDependencies,
  CommandResult,
  DirectoryFileSorter,
  FileSystem,
  GlobScanner,
} from './types'

/**
 * Command registry maps command names to their handler functions.
 * Adding a new command only requires adding an entry here.
 *
 * Multi-word command names use spaces to match CLI invocation:
 * - `dust new task` -> `new task`
 * - `dust pre push` -> `pre push`
 */
const commandRegistry = {
  init,
  lint: lintMarkdown,
  list,
  tasks,
  principles,
  ideas,
  facts,
  next,
  check,
  agent,
  audit,
  'bucket worker': bucketWorker,
  'bucket tool': bucketTool,
  focus,
  'new task': newTask,
  'new principle': newPrinciple,
  'new idea': newIdea,
  'implement task': implementTask,
  'pick task': pickTask,
  'loop claude': loopClaude,
  'loop codex': loopCodex,
  'pre push': prePush,
  migrate,
  help,
}

type Command = keyof typeof commandRegistry

// Top-level commands shown in help (excludes multi-word subcommands)
export const COMMANDS = Object.keys(commandRegistry).filter(
  cmd => !cmd.includes(' ')
) as Command[]

// Re-export for backward compatibility
export { generateHelpText }

interface MainOptions {
  commandArguments: string[]
  context: CommandContext
  fileSystem: FileSystem
  glob: GlobScanner
  directoryFileSorter?: DirectoryFileSorter
  runtime: RuntimeConfig
}

export function isHelpRequest(command: string | undefined): boolean {
  return (
    !command || command === 'help' || command === '--help' || command === '-h'
  )
}

export function isVersionRequest(command: string | undefined): boolean {
  return command === '--version' || command === '-v'
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
 * Resolves command arguments to a command name.
 * Tries progressively longer command chains until it finds a match.
 *
 * For example, with commandArguments ['agent', 'new', 'task', 'extra']:
 * - Tries 'agent new task extra' -> not found
 * - Tries 'agent new task' -> found! Returns { command: 'agent new task', remaining: ['extra'] }
 */
function resolveCommand(commandArguments: string[]): {
  command: string | null
  remaining: string[]
} {
  // Try progressively shorter command chains
  for (let i = commandArguments.length; i > 0; i--) {
    const candidate = commandArguments.slice(0, i).join(' ')
    if (candidate in commandRegistry) {
      return { command: candidate, remaining: commandArguments.slice(i) }
    }
  }

  return { command: null, remaining: commandArguments }
}

export async function main(options: MainOptions): Promise<CommandResult> {
  const {
    commandArguments,
    context,
    fileSystem,
    glob,
    directoryFileSorter,
    runtime,
  } = options

  const settings = await loadSettings(context.cwd, fileSystem, runtime)
  const helpText = generateHelpText(settings)

  if (isVersionRequest(commandArguments[0])) {
    context.stdout(DUST_VERSION)
    return { exitCode: 0 }
  }

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
    directoryFileSorter,
    runtime,
  }

  return runCommand(command, dependencies)
}

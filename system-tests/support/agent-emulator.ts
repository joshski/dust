/**
 * Agent emulator for e2e tests
 *
 * Simulates an AI agent that follows dust instructions by:
 * - Parsing command output to determine next actions
 * - Executing predefined actions based on test scenarios
 * - Capturing the full session transcript for assertions
 */

import type { CommandResult, ShellEmulator } from './shell-emulator'

export interface SessionTurn {
  command: string
  result: CommandResult
}

export interface AgentSession {
  turns: SessionTurn[]
}

/**
 * Error thrown when no handler matches command output
 */
export class NoHandlerMatchError extends Error {
  constructor(
    public readonly command: string,
    public readonly output: string,
    public readonly turns: SessionTurn[]
  ) {
    super(
      `No handler matched output from command "${command}".\n` +
        `Output (truncated): ${output.slice(0, 200)}${output.length > 200 ? '...' : ''}`
    )
    this.name = 'NoHandlerMatchError'
  }
}

/**
 * Action handlers that map pattern matches to shell commands
 */
export interface ActionHandler {
  /** Pattern to match in command output */
  pattern: RegExp
  /** Generate the next command to execute */
  getCommand: (match: RegExpMatchArray, output: string) => string | null
}

/**
 * Default action handlers for standard dust workflows
 */
const defaultActionHandlers: ActionHandler[] = [
  {
    // Match "dust new task" instruction from agent greeting
    pattern: /dust new task/,
    getCommand: () => 'bin/dust new task',
  },
]

interface AgentEmulatorOptions {
  /** Custom action handlers (merged with defaults unless useDefaultHandlers is false) */
  actionHandlers?: ActionHandler[]
  /** Maximum number of turns before stopping */
  maxTurns?: number
  /** Whether to include default action handlers (default: true) */
  useDefaultHandlers?: boolean
}

interface AgentEmulator {
  /** Run a multi-turn session starting with the given command */
  runSession(initialCommand: string): Promise<AgentSession>
}

/**
 * Creates an agent emulator that simulates AI agent behavior
 *
 * @param shell - The shell emulator to use for command execution
 * @param options - Configuration options
 */
export function createAgentEmulator(
  shell: ShellEmulator,
  options: AgentEmulatorOptions = {}
): AgentEmulator {
  const {
    actionHandlers = [],
    maxTurns = 10,
    useDefaultHandlers = true,
  } = options

  // Combine custom handlers with defaults (custom handlers take priority)
  const handlers = useDefaultHandlers
    ? [...actionHandlers, ...defaultActionHandlers]
    : actionHandlers

  const runSession = async (initialCommand: string): Promise<AgentSession> => {
    const turns: SessionTurn[] = []
    let currentCommand: string | null = initialCommand

    while (currentCommand && turns.length < maxTurns) {
      const result = await shell.exec(currentCommand)
      turns.push({ command: currentCommand, result })

      const output = result.stdout + result.stderr

      // Find next command from handlers
      let handlerMatched = false

      for (const handler of handlers) {
        const match = output.match(handler.pattern)
        if (match) {
          handlerMatched = true
          currentCommand = handler.getCommand(match, output)
          break
        }
      }

      // Throw if no handler matched (defensive)
      if (!handlerMatched) {
        throw new NoHandlerMatchError(currentCommand, output, turns)
      }

      // Handler returned null = successful stop
      if (!currentCommand) {
        return { turns }
      }
    }

    return { turns }
  }

  return {
    runSession,
  }
}

/**
 * Utility to create a simple scenario-based agent
 *
 * @param scenario - Array of commands to execute in sequence
 */
export function createScenarioAgent(
  shell: ShellEmulator,
  scenario: string[]
): AgentEmulator {
  let step = 0

  return createAgentEmulator(shell, {
    actionHandlers: [
      {
        pattern: /.*/s, // Match anything
        getCommand: () => {
          step++
          // Return next command or null to stop
          return scenario[step] ?? null
        },
      },
    ],
  })
}

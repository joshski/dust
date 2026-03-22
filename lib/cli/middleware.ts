/**
 * Middleware support for CLI command execution
 *
 * Middleware allows cross-cutting concerns (tracing, logging, guards)
 * to be composed separately from command logic.
 */

import type { CommandDependencies, CommandResult } from './types'

/**
 * Middleware interface for command execution
 *
 * - before: Runs before command execution. Return a CommandResult to short-circuit.
 * - after: Runs after command execution. Can transform the result.
 */
export interface CommandMiddleware {
  before?(
    command: string,
    dependencies: CommandDependencies
  ): Promise<void | CommandResult>
  after?(command: string, result: CommandResult): Promise<CommandResult>
}

type CommandExecutor = (
  command: string,
  dependencies: CommandDependencies
) => Promise<CommandResult>

/**
 * Composes middlewares into a command executor
 *
 * Middlewares run in order: first middleware's before runs first,
 * last middleware's after runs last (wrapping style).
 *
 * @param middlewares - Array of middlewares to apply
 * @param execute - The underlying command executor
 * @returns A new executor with middleware applied
 */
export function applyMiddleware(
  middlewares: CommandMiddleware[],
  execute: CommandExecutor
): CommandExecutor {
  return async (command: string, dependencies: CommandDependencies) => {
    // Run before hooks in order
    for (const middleware of middlewares) {
      if (middleware.before) {
        const result = await middleware.before(command, dependencies)
        if (result !== undefined) {
          // Short-circuit: middleware returned a result
          return result
        }
      }
    }

    // Execute the command
    let result = await execute(command, dependencies)

    // Run after hooks in order
    for (const middleware of middlewares) {
      if (middleware.after) {
        result = await middleware.after(command, result)
      }
    }

    return result
  }
}

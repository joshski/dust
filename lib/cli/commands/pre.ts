/**
 * dust pre - Pre-push and other git hook handlers
 *
 * Currently supports:
 * - `dust pre push` - runs `dust check` for pre-push hooks
 */

import type { CommandDependencies, CommandResult } from '../types'
import { check } from './check'

export const PRE_SUBCOMMANDS = ['push'] as const

export type PreSubcommand = (typeof PRE_SUBCOMMANDS)[number]

export async function pre(deps: CommandDependencies): Promise<CommandResult> {
  const { arguments: args, context: ctx } = deps
  const subcommand = args[0]

  if (!subcommand) {
    ctx.stderr('Usage: dust pre <subcommand>')
    ctx.stderr(`Available subcommands: ${PRE_SUBCOMMANDS.join(', ')}`)
    return { exitCode: 1 }
  }

  switch (subcommand) {
    case 'push':
      // Run dust check for pre-push hook
      return check(deps)
    default:
      ctx.stderr(`Unknown subcommand: ${subcommand}`)
      ctx.stderr(`Available subcommands: ${PRE_SUBCOMMANDS.join(', ')}`)
      return { exitCode: 1 }
  }
}

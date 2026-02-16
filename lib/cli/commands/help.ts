/**
 * dust help - Display help text
 */

import { dedent } from '../dedent'
import type { CommandDependencies, CommandResult } from '../types'

export function generateHelpText(settings: { dustCommand: string }): string {
  const bin = settings.dustCommand

  return dedent`
    💨 dust - Flow state for AI coding agents.

    Usage: ${bin} <command> [options]

    Commands:
      init              Initialize a new Dust repository
      lint markdown     Run lint checks on .dust/ files
      list              List all items (tasks, ideas, goals, facts)
      tasks             List tasks (actionable work with definitions of done)
      ideas             List ideas (vague proposals, convert to tasks when ready)
      goals             List goals (guiding principles, stable, rarely change)
      facts             List facts (documentation of current system state)
      next              Show tasks ready to work on (not blocked)
      check             Run project-defined quality gate hook
      agent             Agent greeting and routing instructions
      focus             Declare current objective (for remote session tracking)
      pick task         Pick the next task to work on
      implement task    Implement a task
      new task          Create a new task
      new goal          Create a new goal
      new idea          Create a new idea
      loop claude       Run continuous Claude iteration on tasks
      pre push          Git pre-push hook validation
      help              Show this help message

    🤖 Agent Guide

    Dust is a lightweight planning system. The .dust/ directory contains:
    - goals/  - Guiding principles (stable, rarely change)
    - ideas/  - Proposals (convert to tasks when ready)
    - tasks/  - Actionable work with definitions of done
    - facts/  - Documentation of current system state

    Workflow: Pick a task → implement it → delete the task file → commit atomically.

    Run \`${bin} agent\` to get started!
  `
}

export async function help(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  dependencies.context.stdout(generateHelpText(dependencies.settings))
  return { exitCode: 0 }
}

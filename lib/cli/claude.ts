/**
 * Agent-specific commands for Claude
 *
 * Provides focused, workflow-specific guidance for AI agents.
 */

import type { DustSettings } from './settings'
import type { CommandContext, CommandResult } from './types'

export const CLAUDE_SUBCOMMANDS = [
  'work',
  'tasks',
  'goals',
  'ideas',
  'help',
] as const

export type ClaudeSubcommand = (typeof CLAUDE_SUBCOMMANDS)[number]

function generateClaudeGreeting(settings: DustSettings): string {
  const bin = settings.binaryPath
  return `Hello Claude, welcome to dust!

Your goal today is to make ONE SMALL CHANGE and then commit and push your changes.

Based on what the user asked you to do, run the appropriate command:

- If the user mentioned "work" → run \`${bin} claude work\`
- If the user mentioned "task" or "tasks" → run \`${bin} claude tasks\`
- If the user mentioned "goal" or "goals" → run \`${bin} claude goals\`
- If the user mentioned "idea" or "ideas" → run \`${bin} claude ideas\`
- For anything else → run \`${bin} claude help\`
`
}

function generateWorkInstructions(settings: DustSettings): string {
  const bin = settings.binaryPath
  return `## Work on the Next Task

Follow these steps:

1. Run \`${bin} check\` to verify the project is in a good state
2. Run \`${bin} next\` to see available tasks
3. Pick ONE task and read its file to understand the requirements
4. Implement the task, checking off items in "Definition of done"
5. Run \`${bin} check\` before committing
6. Create a single atomic commit that includes:
   - All implementation changes
   - Deletion of the completed task file
   - Updates to any facts that changed
   - Deletion of any ideas that were fully realized

Keep your change small and focused. One task, one commit.
`
}

function generateTasksInstructions(settings: DustSettings): string {
  const bin = settings.binaryPath
  return `## Task Management

**List tasks:** \`${bin} list tasks\`
**Find ready tasks:** \`${bin} next\`

Tasks live in \`.dust/tasks/\` as markdown files. Each task has:
- \`## Goals\` - Links to goals this task supports
- \`## Blocked by\` - Tasks that must complete first
- \`## Definition of done\` - Checklist of completion criteria

A task is ready when "Blocked by" is empty or says "(none)".

**Creating tasks:** Write a new markdown file in \`.dust/tasks/\` following the format above.

**Completing tasks:** Delete the task file in your commit after implementation.
`
}

function generateGoalsInstructions(settings: DustSettings): string {
  const bin = settings.binaryPath
  return `## Understanding Goals

**List goals:** \`${bin} list goals\`

Goals live in \`.dust/goals/\` as markdown files. They define the project's guiding principles and priorities.

Goals are linked from tasks to show which principles each task supports. When working on a task, you can read its linked goals for context on why the work matters.

Goals are stable—they rarely change. Tasks come and go, but goals persist.
`
}

function generateIdeasInstructions(settings: DustSettings): string {
  const bin = settings.binaryPath
  return `## Working with Ideas

**List ideas:** \`${bin} list ideas\`

Ideas live in \`.dust/ideas/\` as markdown files. They are intentionally vague proposals for future work.

**Converting an idea to tasks:**
1. Read the idea file to understand the proposal
2. Break it down into concrete, actionable tasks
3. Create task files in \`.dust/tasks/\` with clear definitions of done
4. Delete the idea file once it's fully captured in tasks

Ideas are cheap to create and easy to discard. Not every idea becomes a task.
`
}

function generateClaudeHelp(settings: DustSettings): string {
  const bin = settings.binaryPath
  return `## Dust Agent Guide

Dust is a lightweight planning system. The \`.dust/\` directory contains:

- **goals/** - Guiding principles (stable, rarely change)
- **ideas/** - Vague proposals (convert to tasks when ready)
- **tasks/** - Actionable work with definitions of done
- **facts/** - Documentation of current system state
- **hooks/** - Quality gate scripts

**Key commands:**
- \`${bin} check\` - Run quality gates (do this before and after work)
- \`${bin} next\` - Show tasks ready to work on
- \`${bin} list [type]\` - List artifacts (tasks, ideas, goals, facts)
- \`${bin} validate\` - Check .dust/ files for errors

**Workflow:** Pick a task, implement it, delete the task file, commit atomically.

For focused guidance, run:
- \`${bin} claude work\` - Work on the next task
- \`${bin} claude tasks\` - Task management
- \`${bin} claude goals\` - Understanding goals
- \`${bin} claude ideas\` - Working with ideas
`
}

export async function claude(
  ctx: CommandContext,
  args: string[],
  settings: DustSettings
): Promise<CommandResult> {
  const subcommand = args[0]

  if (!subcommand) {
    ctx.stdout(generateClaudeGreeting(settings))
    return { exitCode: 0 }
  }

  switch (subcommand) {
    case 'work':
      ctx.stdout(generateWorkInstructions(settings))
      return { exitCode: 0 }
    case 'tasks':
      ctx.stdout(generateTasksInstructions(settings))
      return { exitCode: 0 }
    case 'goals':
      ctx.stdout(generateGoalsInstructions(settings))
      return { exitCode: 0 }
    case 'ideas':
      ctx.stdout(generateIdeasInstructions(settings))
      return { exitCode: 0 }
    case 'help':
      ctx.stdout(generateClaudeHelp(settings))
      return { exitCode: 0 }
    default:
      ctx.stderr(`Unknown subcommand: ${subcommand}`)
      ctx.stderr(`Available: ${CLAUDE_SUBCOMMANDS.join(', ')}`)
      return { exitCode: 1 }
  }
}

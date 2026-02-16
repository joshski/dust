/**
 * dust agent - Agent greeting and routing instructions
 *
 * Displays the welcome message and command routing guidance for AI agents.
 */

import { dedent } from '../dedent'
import type { CommandDependencies, CommandResult } from '../types'
import {
  manageGitHooks,
  type TemplateVarsWithInstructions,
  templateVariablesWithInstructions,
} from './agent-shared'

function agentGreeting(vars: TemplateVarsWithInstructions): string {
  const instructions = vars.agentInstructions
    ? `\n---\n\n${vars.agentInstructions}`
    : ''

  return dedent`
    🤖 Hello ${vars.agentName}, welcome to dust!

    CRITICAL: You MUST run exactly ONE of the commands below before doing anything else.

    Determine the user's intent and run the matching command NOW:

    1. **Pick up work from the backlog** → \`${vars.bin} pick task\`
       User wants to start working. Examples: "work", "go", "pick a task", "what's next?"

    2. **Implement a specific task** → \`${vars.bin} focus "<task name>"\`
       User mentions a particular task by name. Examples: "implement the auth task", "work on caching"

    3. **Capture a new task** → \`${vars.bin} new task\`
       User has concrete work to add. Keywords: "task: ..." or "add a task ..."

    4. **Capture a new goal** → \`${vars.bin} new goal\`
       User has a higher-level objective to add. Keywords: "goal: ..." or "add a goal ..."

    5. **Capture a vague idea** → \`${vars.bin} new idea\`
       User has a rough idea that might become work later. Keywords: "idea: ..." or "add an idea ..."

    6. **Unclear** → \`${vars.bin} help\`
       If none of the above clearly apply, run this to see all available commands.

    Do NOT proceed without running one of these commands.${instructions}
  `
}

export async function agent(
  dependencies: CommandDependencies,
  env: NodeJS.ProcessEnv = process.env
): Promise<CommandResult> {
  const { context, fileSystem, settings } = dependencies

  // Detect if running in an automated loop context
  if (env.DUST_SKIP_AGENT === '1') {
    context.stdout(
      "You're running in an automated loop - proceeding to implement the assigned task."
    )
    return { exitCode: 0 }
  }

  const hooksInstalled = await manageGitHooks(dependencies)

  const vars = await templateVariablesWithInstructions(
    context.cwd,
    fileSystem,
    settings,
    hooksInstalled,
    env
  )
  context.stdout(agentGreeting(vars))

  return { exitCode: 0 }
}

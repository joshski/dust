/**
 * Shared utilities for agent commands
 *
 * Provides common functionality used across all agent-* command files.
 */

import { join } from 'node:path'
import { type AgentType, detectAgent } from '../../agents/detection'
import { isErrorCode } from '../../filesystem/error-codes'
import { createHooksManager } from '../../git/hooks'
import { dedent } from '../dedent'
import type { CommandDependencies, DustSettings, FileReader } from '../types'

/**
 * Type-safe template variables for agent commands.
 * Uses real booleans instead of string-encoded booleans.
 */
export interface TemplateVars {
  bin: string
  agentName: string
  hooksInstalled: boolean
  isClaudeCodeWeb: boolean
  hasIdeaFile: boolean
}

interface TemplateVarsWithInstructions extends TemplateVars {
  agentInstructions: string
}

/**
 * Loads agent-specific instructions from .dust/config/agents/{agent-type}.md
 * Returns empty string if file doesn't exist.
 */
export async function loadAgentInstructions(
  cwd: string,
  fileSystem: FileReader,
  agentType: AgentType
): Promise<string> {
  const instructionsPath = join(
    cwd,
    '.dust',
    'config',
    'agents',
    `${agentType}.md`
  )
  if (!fileSystem.exists(instructionsPath)) {
    return ''
  }
  try {
    const content = await fileSystem.readFile(instructionsPath)
    return content.trim()
  } catch (error) {
    if (isErrorCode(error, 'ENOENT')) {
      return ''
    }
    throw error
  }
}

export function templateVariables(
  settings: DustSettings,
  hooksInstalled: boolean,
  env: NodeJS.ProcessEnv,
  options?: { hasIdeaFile?: boolean }
): TemplateVars {
  const agent = detectAgent(env)
  // Default hasIdeaFile to true - only Decompose Idea tasks have no idea file
  const hasIdeaFile = options?.hasIdeaFile ?? true
  return {
    bin: settings.dustCommand,
    agentName: agent.name,
    hooksInstalled,
    isClaudeCodeWeb: agent.type === 'claude-code-web',
    hasIdeaFile,
  }
}

/**
 * Creates template variables with agent-specific instructions loaded.
 */
export async function templateVariablesWithInstructions(
  cwd: string,
  fileSystem: FileReader,
  settings: DustSettings,
  hooksInstalled: boolean,
  env: NodeJS.ProcessEnv,
  options?: { hasIdeaFile?: boolean }
): Promise<TemplateVarsWithInstructions> {
  const agent = detectAgent(env)
  const agentInstructions = await loadAgentInstructions(
    cwd,
    fileSystem,
    agent.type
  )
  // Default hasIdeaFile to true - only Decompose Idea tasks have no idea file
  const hasIdeaFile = options?.hasIdeaFile ?? true
  return {
    bin: settings.dustCommand,
    agentName: agent.name,
    hooksInstalled,
    isClaudeCodeWeb: agent.type === 'claude-code-web',
    hasIdeaFile,
    agentInstructions,
  }
}

/**
 * Renders the dust agent greeting text.
 *
 * Used by both `dust agent` (printed to the user) and `dust codex hook`
 * (injected as `additionalContext` into the model's session context).
 */
export function agentGreeting(vars: TemplateVarsWithInstructions): string {
  const instructions = vars.agentInstructions
    ? `\n---\n\n${vars.agentInstructions}`
    : ''

  return dedent`
    🤖 Hello ${vars.agentName}, welcome to dust!

    Dust is a CLI tool for managing software development workflows through markdown artifacts. It stores tasks, ideas, principles, and facts in \`.dust/\` directories, giving you structured context about the project and a backlog to work from.

    CRITICAL: You MUST run exactly ONE of the commands below before doing anything else.

    Determine the user's intent and run the matching command NOW:

    1. **Pick up work from the backlog** → \`${vars.bin} pick task\`
       User wants to start working. Examples: "work", "go", "pick a task", "what's next?"

    2. **Implement a specific task** → \`${vars.bin} focus "<task name>"\`
       User mentions a particular task by name. Examples: "implement the auth task", "work on caching"

    3. **Capture a new task** → \`${vars.bin} new task\`
       User has concrete work to add. Keywords: "task: ..." or "add a task ..."

    4. **Capture a new principle** → \`${vars.bin} new principle\`
       User has a guiding value to add. Keywords: "principle: ..." or "add a principle ..."

    5. **Capture a vague idea** → \`${vars.bin} new idea\`
       User has a rough idea that might become work later. Keywords: "idea: ..." or "add an idea ..."

    6. **Unclear** → \`${vars.bin} help\`
       If none of the above clearly apply, run this to see all available commands.

    Note: "tasks" here refers to dust task files in \`.dust/tasks/\`, not internal task tracking tools.

    Do NOT proceed without running one of these commands.${instructions}
  `
}

/**
 * Manages git hook installation for agent commands.
 * Automatically installs pre-push hooks if:
 * - Git is available
 * - Hooks are not already installed
 * Also verifies and updates the binary path if needed.
 * Returns whether hooks are installed.
 */
export async function manageGitHooks(
  dependencies: CommandDependencies
): Promise<boolean> {
  const { context, fileSystem, settings } = dependencies
  const hooks = createHooksManager(context.cwd, fileSystem, settings)

  // Skip if not a git repo
  if (!hooks.isGitRepo()) {
    return false
  }

  const isInstalled = await hooks.isHookInstalled()

  if (!isInstalled) {
    // Install hooks
    await hooks.installHook()
    return true
  }

  // Verify binary path matches current settings
  const hookBinaryPath = await hooks.getHookBinaryPath()
  if (hookBinaryPath && hookBinaryPath !== settings.dustCommand) {
    await hooks.updateHookBinaryPath(settings.dustCommand)
  }

  return true
}

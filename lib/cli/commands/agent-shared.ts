/**
 * Shared utilities for agent commands
 *
 * Provides common functionality used across all agent-* command files.
 */

import { join } from 'node:path'
import { type AgentType, detectAgent } from '../../agents/detection'
import { createHooksManager } from '../../git/hooks'
import type {
  CommandDependencies,
  DustSettings,
  ReadableFileSystem,
} from '../types'

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

export interface TemplateVarsWithInstructions extends TemplateVars {
  agentInstructions: string
}

/**
 * Loads agent-specific instructions from .dust/config/agents/{agent-type}.md
 * Returns empty string if file doesn't exist.
 */
export async function loadAgentInstructions(
  cwd: string,
  fileSystem: ReadableFileSystem,
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
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return ''
    }
    throw error
  }
}

export function templateVariables(
  settings: DustSettings,
  hooksInstalled: boolean,
  env: NodeJS.ProcessEnv = process.env,
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
  fileSystem: ReadableFileSystem,
  settings: DustSettings,
  hooksInstalled: boolean,
  env: NodeJS.ProcessEnv = process.env,
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

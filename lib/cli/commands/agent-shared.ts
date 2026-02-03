/**
 * Shared utilities for agent commands
 *
 * Provides common functionality used across all agent-* command files.
 */

import { detectAgent } from '../../agents/detection'
import { createHooksManager } from '../../git/hooks'
import type { CommandDependencies, DustSettings } from '../types'

export function templateVariables(
  settings: DustSettings,
  hooksInstalled: boolean,
  env: NodeJS.ProcessEnv = process.env
) {
  const agent = detectAgent(env)
  return {
    bin: settings.dustCommand,
    agentName: agent.name,
    hooksInstalled: hooksInstalled ? 'true' : 'false',
    isClaudeCodeWeb: agent.type === 'claude-code-web' ? 'true' : '',
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

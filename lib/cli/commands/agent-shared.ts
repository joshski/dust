/**
 * Shared utilities for agent commands
 *
 * Provides common functionality used across all agent-* command files.
 */

import { createHooksManager } from '../../git/hooks'
import type { CommandDependencies, DustSettings } from '../types'

/**
 * Detects which agent environment is running based on environment variables.
 *
 * Detection priority:
 * 1. CLAUDECODE + CLAUDE_CODE_ENTRYPOINT=remote → "Claude Code Web"
 * 2. CLAUDECODE alone → "Claude Code"
 * 3. CODEX_HOME → "Codex"
 * 4. Fallback → "Agent"
 */
export function detectAgent(env: NodeJS.ProcessEnv = process.env): string {
  if (env.CLAUDECODE) {
    if (env.CLAUDE_CODE_ENTRYPOINT === 'remote') {
      return 'Claude Code Web'
    }
    return 'Claude Code'
  }
  if (env.CODEX_HOME) {
    return 'Codex'
  }
  return 'Agent'
}

export function templateVariables(
  settings: DustSettings,
  hooksInstalled: boolean,
  env: NodeJS.ProcessEnv = process.env
) {
  const agentName = detectAgent(env)
  return {
    bin: settings.dustCommand,
    agentName,
    hooksInstalled: hooksInstalled ? 'true' : 'false',
    isClaudeCodeWeb: agentName === 'Claude Code Web' ? 'true' : '',
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

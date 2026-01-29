/**
 * Shared utilities for agent commands
 *
 * Provides common functionality used across all agent-* command files.
 */

import { createHooksManager } from '../../git/hooks'
import type { CommandDependencies, DustSettings } from '../types'

export function templateVariables(
  settings: DustSettings,
  hooksInstalled: boolean
) {
  return {
    bin: settings.dustCommand,
    installDependenciesHint:
      settings.installDependenciesHint || 'Install any dependencies',
    hooksInstalled: hooksInstalled ? 'true' : 'false',
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
  deps: CommandDependencies
): Promise<boolean> {
  const { context: ctx, fileSystem: fs, settings } = deps
  const hooks = createHooksManager(ctx.cwd, fs, settings)

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

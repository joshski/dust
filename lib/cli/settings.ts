/**
 * Settings module for dust CLI
 *
 * Reads optional configuration from .dust/config/settings.json
 */

import { join } from 'node:path'
import type { CheckConfig, DustSettings, FileSystem } from './types'

// Re-export for backwards compatibility
export type { CheckConfig, DustSettings }

const DEFAULT_SETTINGS: DustSettings = {
  dustCommand: 'npx dust',
}

/**
 * Detects the appropriate dust command based on lockfiles and environment.
 * Priority:
 * 1. bun.lockb exists → bunx dust
 * 2. pnpm-lock.yaml exists → pnpx dust
 * 3. package-lock.json exists → npx dust
 * 4. No lockfile + BUN_INSTALL env var set → bunx dust
 * 5. Default → npx dust
 */
export function detectDustCommand(cwd: string, fs: FileSystem): string {
  if (fs.exists(join(cwd, 'bun.lockb'))) {
    return 'bunx dust'
  }
  if (fs.exists(join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpx dust'
  }
  if (fs.exists(join(cwd, 'package-lock.json'))) {
    return 'npx dust'
  }
  if (process.env.BUN_INSTALL) {
    return 'bunx dust'
  }
  return 'npx dust'
}

export async function loadSettings(
  cwd: string,
  fs: FileSystem
): Promise<DustSettings> {
  const settingsPath = join(cwd, '.dust', 'config', 'settings.json')

  if (!fs.exists(settingsPath)) {
    return {
      dustCommand: detectDustCommand(cwd, fs),
    }
  }

  try {
    const content = await fs.readFile(settingsPath)
    const parsed = JSON.parse(content)
    // Only use auto-detection if dustCommand is not explicitly set
    if (!parsed.dustCommand) {
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        dustCommand: detectDustCommand(cwd, fs),
      }
    }
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    }
  } catch {
    return {
      dustCommand: detectDustCommand(cwd, fs),
    }
  }
}

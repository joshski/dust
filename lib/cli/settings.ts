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
  installDependenciesHint: 'Install any dependencies',
}

/**
 * Detects the appropriate install dependencies hint based on lockfiles.
 * Priority:
 * 1. bun.lockb or bun.lock exists → Run `bun install`
 * 2. pnpm-lock.yaml exists → Run `pnpm install`
 * 3. package-lock.json exists → Run `npm install`
 * 4. yarn.lock exists → Run `yarn install`
 * 5. No lockfile → Install any dependencies
 */
export function detectInstallDependenciesHint(
  cwd: string,
  fs: FileSystem
): string {
  if (fs.exists(join(cwd, 'bun.lockb')) || fs.exists(join(cwd, 'bun.lock'))) {
    return 'Run `bun install`'
  }
  if (fs.exists(join(cwd, 'pnpm-lock.yaml'))) {
    return 'Run `pnpm install`'
  }
  if (fs.exists(join(cwd, 'package-lock.json'))) {
    return 'Run `npm install`'
  }
  if (fs.exists(join(cwd, 'yarn.lock'))) {
    return 'Run `yarn install`'
  }
  return 'Install any dependencies'
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
      installDependenciesHint: detectInstallDependenciesHint(cwd, fs),
    }
  }

  try {
    const content = await fs.readFile(settingsPath)
    const parsed = JSON.parse(content)
    const result: DustSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
    }
    // Auto-detect dustCommand if not explicitly set
    if (!parsed.dustCommand) {
      result.dustCommand = detectDustCommand(cwd, fs)
    }
    // Auto-detect installDependenciesHint if not explicitly set
    if (!parsed.installDependenciesHint) {
      result.installDependenciesHint = detectInstallDependenciesHint(cwd, fs)
    }
    return result
  } catch {
    return {
      dustCommand: detectDustCommand(cwd, fs),
      installDependenciesHint: detectInstallDependenciesHint(cwd, fs),
    }
  }
}

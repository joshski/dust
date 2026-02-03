/**
 * Settings module for dust CLI
 *
 * Reads optional configuration from .dust/config/settings.json
 */

import { join } from 'node:path'
import type { CheckConfig, DustSettings, FileSystem } from '../cli/types'

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
export function detectDustCommand(cwd: string, fileSystem: FileSystem): string {
  if (fileSystem.exists(join(cwd, 'bun.lockb'))) {
    return 'bunx dust'
  }
  if (fileSystem.exists(join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpx dust'
  }
  if (fileSystem.exists(join(cwd, 'package-lock.json'))) {
    return 'npx dust'
  }
  if (process.env.BUN_INSTALL) {
    return 'bunx dust'
  }
  return 'npx dust'
}

/**
 * Detects the appropriate test command based on lockfiles and environment.
 * Priority:
 * 1. bun.lockb or bun.lock exists → bun test
 * 2. pnpm-lock.yaml exists → pnpm test
 * 3. package-lock.json exists → npm test
 * 4. yarn.lock exists → yarn test
 * 5. No lockfile + BUN_INSTALL env var set → bun test
 * 6. package.json exists → npm test
 * 7. Default → null (no test command)
 */
export function detectTestCommand(
  cwd: string,
  fileSystem: FileSystem
): string | null {
  if (
    fileSystem.exists(join(cwd, 'bun.lockb')) ||
    fileSystem.exists(join(cwd, 'bun.lock'))
  ) {
    return 'bun test'
  }
  if (fileSystem.exists(join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm test'
  }
  if (fileSystem.exists(join(cwd, 'package-lock.json'))) {
    return 'npm test'
  }
  if (fileSystem.exists(join(cwd, 'yarn.lock'))) {
    return 'yarn test'
  }
  if (process.env.BUN_INSTALL) {
    return 'bun test'
  }
  if (fileSystem.exists(join(cwd, 'package.json'))) {
    return 'npm test'
  }
  return null
}

export async function loadSettings(
  cwd: string,
  fileSystem: FileSystem
): Promise<DustSettings> {
  const settingsPath = join(cwd, '.dust', 'config', 'settings.json')

  if (!fileSystem.exists(settingsPath)) {
    const result: DustSettings = {
      dustCommand: detectDustCommand(cwd, fileSystem),
    }
    // Override eventsUrl with env var if set
    if (process.env.DUST_EVENTS_URL) {
      result.eventsUrl = process.env.DUST_EVENTS_URL
    }
    return result
  }

  try {
    const content = await fileSystem.readFile(settingsPath)
    const parsed = JSON.parse(content)
    const result: DustSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
    }
    // Auto-detect dustCommand if not explicitly set
    if (!parsed.dustCommand) {
      result.dustCommand = detectDustCommand(cwd, fileSystem)
    }
    // Override eventsUrl with env var if set
    if (process.env.DUST_EVENTS_URL) {
      result.eventsUrl = process.env.DUST_EVENTS_URL
    }
    return result
  } catch {
    const result: DustSettings = {
      dustCommand: detectDustCommand(cwd, fileSystem),
    }
    // Override eventsUrl with env var if set
    if (process.env.DUST_EVENTS_URL) {
      result.eventsUrl = process.env.DUST_EVENTS_URL
    }
    return result
  }
}

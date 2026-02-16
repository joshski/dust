/**
 * Settings module for dust CLI
 *
 * Reads optional configuration from .dust/config/settings.json
 */

import { join } from 'node:path'
import type { CheckConfig, DustSettings, FileSystem } from '../cli/types'

// Re-export for backwards compatibility
export type { CheckConfig, DustSettings }

export interface SettingsViolation {
  message: string
}

const KNOWN_SETTINGS_KEYS = new Set([
  'dustCommand',
  'checks',
  'extraDirectories',
  'installCommand',
  'eventsUrl',
])

const KNOWN_CHECK_KEYS = new Set([
  'name',
  'command',
  'hints',
  'timeoutMilliseconds',
])

function validateCheckEntry(
  check: unknown,
  checkPath: string
): SettingsViolation[] {
  const violations: SettingsViolation[] = []

  if (typeof check === 'string') {
    return violations
  }

  if (typeof check !== 'object' || check === null || Array.isArray(check)) {
    violations.push({ message: `${checkPath} must be a string or object` })
    return violations
  }

  const checkObj = check as Record<string, unknown>

  for (const key of Object.keys(checkObj)) {
    if (!KNOWN_CHECK_KEYS.has(key)) {
      violations.push({
        message: `Unknown key "${key}" in ${checkPath}. Known keys: ${[...KNOWN_CHECK_KEYS].sort().join(', ')}`,
      })
    }
  }

  if (!('name' in checkObj)) {
    violations.push({ message: `${checkPath} is missing required field "name"` })
  } else if (typeof checkObj.name !== 'string') {
    violations.push({ message: `${checkPath}.name must be a string` })
  }

  if (!('command' in checkObj)) {
    violations.push({
      message: `${checkPath} is missing required field "command"`,
    })
  } else if (typeof checkObj.command !== 'string') {
    violations.push({ message: `${checkPath}.command must be a string` })
  }

  if ('hints' in checkObj) {
    if (!Array.isArray(checkObj.hints)) {
      violations.push({
        message: `${checkPath}.hints must be an array of strings`,
      })
    } else {
      for (let j = 0; j < checkObj.hints.length; j++) {
        if (typeof checkObj.hints[j] !== 'string') {
          violations.push({
            message: `${checkPath}.hints[${j}] must be a string`,
          })
        }
      }
    }
  }

  if ('timeoutMilliseconds' in checkObj) {
    if (
      typeof checkObj.timeoutMilliseconds !== 'number' ||
      checkObj.timeoutMilliseconds <= 0
    ) {
      violations.push({
        message: `${checkPath}.timeoutMilliseconds must be a positive number`,
      })
    }
  }

  return violations
}

export function validateChecksConfig(
  settings: Record<string, unknown>
): SettingsViolation[] {
  if (!('checks' in settings)) {
    return []
  }
  if (!Array.isArray(settings.checks)) {
    return [{ message: '"checks" must be an array' }]
  }
  const violations: SettingsViolation[] = []
  for (let i = 0; i < settings.checks.length; i++) {
    violations.push(...validateCheckEntry(settings.checks[i], `checks[${i}]`))
  }
  return violations
}

export function validateExtraDirectories(
  settings: Record<string, unknown>
): SettingsViolation[] {
  if (!('extraDirectories' in settings)) {
    return []
  }
  if (!Array.isArray(settings.extraDirectories)) {
    return [{ message: '"extraDirectories" must be an array of strings' }]
  }
  const violations: SettingsViolation[] = []
  for (let i = 0; i < settings.extraDirectories.length; i++) {
    if (typeof settings.extraDirectories[i] !== 'string') {
      violations.push({ message: `extraDirectories[${i}] must be a string` })
    }
  }
  return violations
}

export function validateDustEventsUrl(
  settings: Record<string, unknown>
): SettingsViolation[] {
  if ('eventsUrl' in settings && typeof settings.eventsUrl !== 'string') {
    return [{ message: '"eventsUrl" must be a string' }]
  }
  return []
}

export function validateSettingsJson(content: string): SettingsViolation[] {
  const violations: SettingsViolation[] = []

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (error) {
    // JSON.parse always throws a SyntaxError which extends Error
    violations.push({
      message: `Invalid JSON: ${(error as Error).message}`,
    })
    return violations
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    violations.push({
      message: 'settings.json must be a JSON object',
    })
    return violations
  }

  const settings = parsed as Record<string, unknown>

  for (const key of Object.keys(settings)) {
    if (!KNOWN_SETTINGS_KEYS.has(key)) {
      violations.push({
        message: `Unknown key "${key}" in settings.json. Known keys: ${[...KNOWN_SETTINGS_KEYS].sort().join(', ')}`,
      })
    }
  }

  violations.push(...validateChecksConfig(settings))
  violations.push(...validateExtraDirectories(settings))
  violations.push(...validateDustEventsUrl(settings))

  if ('dustCommand' in settings && typeof settings.dustCommand !== 'string') {
    violations.push({ message: '"dustCommand" must be a string' })
  }

  if (
    'installCommand' in settings &&
    typeof settings.installCommand !== 'string'
  ) {
    violations.push({ message: '"installCommand" must be a string' })
  }

  return violations
}

const DEFAULT_SETTINGS: DustSettings = {
  dustCommand: 'npx dust',
  installCommand: 'npm install',
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
 * Detects the appropriate install command based on lockfiles and environment.
 * Priority:
 * 1. bun.lockb exists → bun install
 * 2. pnpm-lock.yaml exists → pnpm install
 * 3. package-lock.json exists → npm install
 * 4. No lockfile + BUN_INSTALL env var set → bun install
 * 5. Default → npm install
 */
export function detectInstallCommand(
  cwd: string,
  fileSystem: FileSystem
): string {
  if (fileSystem.exists(join(cwd, 'bun.lockb'))) {
    return 'bun install'
  }
  if (fileSystem.exists(join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm install'
  }
  if (fileSystem.exists(join(cwd, 'package-lock.json'))) {
    return 'npm install'
  }
  if (process.env.BUN_INSTALL) {
    return 'bun install'
  }
  return 'npm install'
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

function normalizeCheckEntry(entry: string | CheckConfig): CheckConfig {
  if (typeof entry === 'string') {
    return { name: entry, command: entry }
  }
  return entry
}

export async function loadSettings(
  cwd: string,
  fileSystem: FileSystem
): Promise<DustSettings> {
  const settingsPath = join(cwd, '.dust', 'config', 'settings.json')

  if (!fileSystem.exists(settingsPath)) {
    const result: DustSettings = {
      dustCommand: detectDustCommand(cwd, fileSystem),
      installCommand: detectInstallCommand(cwd, fileSystem),
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
    if (Array.isArray(parsed.checks)) {
      parsed.checks = parsed.checks.map(normalizeCheckEntry)
    }
    const result: DustSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
    }
    // Auto-detect dustCommand if not explicitly set
    if (!parsed.dustCommand) {
      result.dustCommand = detectDustCommand(cwd, fileSystem)
    }
    // Auto-detect installCommand if not explicitly set
    if (!parsed.installCommand) {
      result.installCommand = detectInstallCommand(cwd, fileSystem)
    }
    // Override eventsUrl with env var if set
    if (process.env.DUST_EVENTS_URL) {
      result.eventsUrl = process.env.DUST_EVENTS_URL
    }
    return result
  } catch {
    const result: DustSettings = {
      dustCommand: detectDustCommand(cwd, fileSystem),
      installCommand: detectInstallCommand(cwd, fileSystem),
    }
    // Override eventsUrl with env var if set
    if (process.env.DUST_EVENTS_URL) {
      result.eventsUrl = process.env.DUST_EVENTS_URL
    }
    return result
  }
}

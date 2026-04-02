/**
 * Settings module for dust CLI
 *
 * Reads optional configuration from .dust/config/settings.json
 */

import { join } from 'node:path'
import type { CheckConfig, DustSettings, FileReader } from '../cli/types'
import type { RuntimeConfig } from '../env-config'
import { isErrorCode } from '../filesystem/error-codes'

// Re-export for backwards compatibility
export type { CheckConfig, DustSettings }

interface SettingsViolation {
  message: string
}

const KNOWN_SETTINGS_KEYS = new Set([
  'dustCommand',
  'checks',
  'excludeCorePrinciples',
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
        message: `Unknown key "${key}" in ${checkPath}. Known keys: ${[...KNOWN_CHECK_KEYS].toSorted().join(', ')}`,
      })
    }
  }

  if (!('name' in checkObj)) {
    violations.push({
      message: `${checkPath} is missing required field "name"`,
    })
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

function validateChecksConfig(
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

function validateExtraDirectories(
  settings: Record<string, unknown>
): SettingsViolation[] {
  if (!('extraDirectories' in settings)) {
    return []
  }

  const violations: SettingsViolation[] = [
    {
      message:
        '"extraDirectories" is deprecated and ignored by lint allowlisting. Remove it from settings.json.',
    },
  ]

  if (!Array.isArray(settings.extraDirectories)) {
    violations.push({
      message: '"extraDirectories" must be an array of strings',
    })
    return violations
  }

  for (let i = 0; i < settings.extraDirectories.length; i++) {
    if (typeof settings.extraDirectories[i] !== 'string') {
      violations.push({ message: `extraDirectories[${i}] must be a string` })
    }
  }
  return violations
}

function validateDustEventsUrl(
  settings: Record<string, unknown>
): SettingsViolation[] {
  if ('eventsUrl' in settings && typeof settings.eventsUrl !== 'string') {
    return [{ message: '"eventsUrl" must be a string' }]
  }
  return []
}

function validateExcludeCorePrinciples(
  settings: Record<string, unknown>
): SettingsViolation[] {
  if (!('excludeCorePrinciples' in settings)) {
    return []
  }

  if (!Array.isArray(settings.excludeCorePrinciples)) {
    return [{ message: '"excludeCorePrinciples" must be an array of strings' }]
  }

  const violations: SettingsViolation[] = []
  for (let i = 0; i < settings.excludeCorePrinciples.length; i++) {
    if (typeof settings.excludeCorePrinciples[i] !== 'string') {
      violations.push({
        message: `excludeCorePrinciples[${i}] must be a string`,
      })
    }
  }
  return violations
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
        message: `Unknown key "${key}" in settings.json. Known keys: ${[...KNOWN_SETTINGS_KEYS].toSorted().join(', ')}`,
      })
    }
  }

  violations.push(...validateChecksConfig(settings))
  violations.push(...validateExcludeCorePrinciples(settings))
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
}

/**
 * Detects the appropriate dust command based on lockfiles and environment.
 * Priority:
 * 1. bun.lock or bun.lockb exists → bunx dust
 * 2. pnpm-lock.yaml exists → pnpx dust
 * 3. package-lock.json exists → npx dust
 * 4. No lockfile + BUN_INSTALL env var set → bunx dust
 * 5. Default → npx dust
 */
export function detectDustCommand(
  cwd: string,
  fileSystem: FileReader,
  runtime: RuntimeConfig
): string {
  if (
    fileSystem.exists(join(cwd, 'bun.lock')) ||
    fileSystem.exists(join(cwd, 'bun.lockb'))
  ) {
    return 'bunx dust'
  }
  if (fileSystem.exists(join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpx dust'
  }
  if (fileSystem.exists(join(cwd, 'package-lock.json'))) {
    return 'npx dust'
  }
  if (runtime.bunInstall) {
    return 'bunx dust'
  }
  return 'npx dust'
}

// Lockfile definitions grouped by ecosystem
const LOCKFILE_COMMANDS: Array<{
  file: string
  command: string
  ecosystem: string
}> = [
  // JavaScript
  { file: 'bun.lock', command: 'bun install', ecosystem: 'js' },
  { file: 'bun.lockb', command: 'bun install', ecosystem: 'js' },
  { file: 'pnpm-lock.yaml', command: 'pnpm install', ecosystem: 'js' },
  { file: 'package-lock.json', command: 'npm install', ecosystem: 'js' },
  // Ruby
  { file: 'Gemfile.lock', command: 'bundle install', ecosystem: 'ruby' },
  // Python
  { file: 'poetry.lock', command: 'poetry install', ecosystem: 'python' },
  { file: 'Pipfile.lock', command: 'pipenv install', ecosystem: 'python' },
  {
    file: 'requirements.txt',
    command: 'pip install -r requirements.txt',
    ecosystem: 'python',
  },
  // Go
  { file: 'go.sum', command: 'go mod download', ecosystem: 'go' },
  // Rust
  { file: 'Cargo.lock', command: 'cargo build', ecosystem: 'rust' },
  // PHP
  { file: 'composer.lock', command: 'composer install', ecosystem: 'php' },
  // Elixir
  { file: 'mix.lock', command: 'mix deps.get', ecosystem: 'elixir' },
]

/**
 * Detects the appropriate install command based on lockfiles.
 * Returns null when:
 * - No recognized lockfile is found
 * - Multiple ecosystems are detected (requires explicit configuration)
 *
 * Priority within each ecosystem follows the order in LOCKFILE_COMMANDS.
 */
export function detectInstallCommand(
  cwd: string,
  fileSystem: FileReader
): string | null {
  const foundEcosystems = new Set<string>()
  let firstCommand: string | null = null

  for (const { file, command, ecosystem } of LOCKFILE_COMMANDS) {
    if (fileSystem.exists(join(cwd, file))) {
      if (firstCommand === null) {
        firstCommand = command
      }
      foundEcosystems.add(ecosystem)
    }
  }

  // Multiple ecosystems detected - require explicit configuration
  if (foundEcosystems.size > 1) {
    return null
  }

  // Return the first matching command, or null if no lockfile found
  return firstCommand
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
  fileSystem: FileReader,
  runtime: RuntimeConfig
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
  if (runtime.bunInstall) {
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
  fileSystem: FileReader,
  runtime: RuntimeConfig
): Promise<DustSettings> {
  const settingsPath = join(cwd, '.dust', 'config', 'settings.json')

  if (!fileSystem.exists(settingsPath)) {
    const result: DustSettings = {
      dustCommand: detectDustCommand(cwd, fileSystem, runtime),
    }
    const installCommand = detectInstallCommand(cwd, fileSystem)
    if (installCommand !== null) {
      result.installCommand = installCommand
    }
    // Override eventsUrl with env var if set
    if (runtime.eventsUrl) {
      result.eventsUrl = runtime.eventsUrl
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
      result.dustCommand = detectDustCommand(cwd, fileSystem, runtime)
    }
    // Auto-detect installCommand if not explicitly set
    if (!parsed.installCommand) {
      const installCommand = detectInstallCommand(cwd, fileSystem)
      if (installCommand !== null) {
        result.installCommand = installCommand
      } else {
        delete result.installCommand
      }
    }
    // Override eventsUrl with env var if set
    if (runtime.eventsUrl) {
      result.eventsUrl = runtime.eventsUrl
    }
    return result
  } catch (error) {
    if (isErrorCode(error, 'ENOENT')) {
      const result: DustSettings = {
        dustCommand: detectDustCommand(cwd, fileSystem, runtime),
      }
      const installCommand = detectInstallCommand(cwd, fileSystem)
      if (installCommand !== null) {
        result.installCommand = installCommand
      }
      // Override eventsUrl with env var if set
      if (runtime.eventsUrl) {
        result.eventsUrl = runtime.eventsUrl
      }
      return result
    }
    throw error
  }
}

/**
 * dust lint - Run lint checks on .dust/ markdown files
 */

import { isAbsolute, join, relative, sep } from 'node:path'
import { validateSettingsJson } from '../../config/settings'
import { validateDirectoryStructure } from '../../lint/validators/directory-validator'
import type { Violation } from '../../lint/validators/types'
import {
  parseArtifacts,
  validateArtifacts,
} from '../../validation/validation-pipeline'
import type { CommandDependencies, CommandResult, FileSystem } from '../types'

interface ValidationResult {
  violations: Violation[]
  didValidate: boolean
}

async function safeReadFile(
  fileSystem: FileSystem,
  filePath: string
): Promise<string | null> {
  try {
    return await fileSystem.readFile(filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw error
  }
}

async function validateSettingsFile(
  fileSystem: FileSystem,
  settingsPath: string
): Promise<ValidationResult> {
  if (!fileSystem.exists(settingsPath)) {
    return { violations: [], didValidate: false }
  }
  const content = await safeReadFile(fileSystem, settingsPath)
  if (content === null) {
    return { violations: [], didValidate: false }
  }
  const violations = validateSettingsJson(content).map(sv => ({
    file: settingsPath,
    message: sv.message,
  }))
  return { violations, didValidate: true }
}

export async function lintMarkdown(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, fileSystem } = dependencies
  const dustPath = `${context.cwd}/.dust`

  if (!fileSystem.exists(dustPath)) {
    context.stderr('Error: .dust directory not found')
    context.stderr("Run 'dust init' to initialize a Dust repository")
    return { exitCode: 1 }
  }

  const violations: Violation[] = []

  context.stdout('Validating directory structure...')
  violations.push(...(await validateDirectoryStructure(dustPath, fileSystem)))

  const settingsPath = join(dustPath, 'config', 'settings.json')
  const settingsResult = await validateSettingsFile(fileSystem, settingsPath)
  if (settingsResult.didValidate) {
    context.stdout('Validating settings.json...')
    violations.push(...settingsResult.violations)
  }

  // Phase 1: Parse all artifacts
  context.stdout('Parsing content files...')
  const { context: validationContext, violations: parseViolations } =
    await parseArtifacts(fileSystem, dustPath)
  violations.push(...parseViolations)

  // Phase 2: Validate all artifacts
  context.stdout('Validating content files...')
  violations.push(...validateArtifacts(validationContext))

  if (violations.length === 0) {
    context.stdout('All validations passed!')
    return { exitCode: 0 }
  }

  context.stderr(`Found ${violations.length} violation(s):`)
  context.stderr('')

  for (const v of violations) {
    const displayPath = renderViolationPath(v.file, context.cwd)
    const location = v.line ? `:${v.line}` : ''
    context.stderr(`  ${displayPath}${location}`)
    context.stderr(`    ${v.message}`)
  }

  return { exitCode: 1 }
}

export function renderViolationPath(filePath: string, cwd: string): string {
  if (!isAbsolute(filePath)) return filePath
  const relativePath = relative(cwd, filePath)
  if (relativePath.length === 0) return filePath
  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    return filePath
  }
  return relativePath
}

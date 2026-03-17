/**
 * dust lint - Run lint checks on .dust/ markdown files
 */

import { isAbsolute, join, relative, sep } from 'node:path'
import {
  type ParsedArtifact,
  parseArtifact,
} from '../../artifacts/parsed-artifact'
import { validateSettingsJson } from '../../config/settings'
import {
  validateImperativeOpeningSentence,
  validateOpeningSentence,
  validateOpeningSentenceLength,
  validateTaskHeadings,
} from '../../lint/validators/content-validator'
import {
  validateContentDirectoryFiles,
  validateDirectoryStructure,
} from '../../lint/validators/directory-validator'
import {
  validateFilename,
  validateTitleFilenameMatch,
} from '../../lint/validators/filename-validator'
import {
  validateIdeaOpenQuestions,
  validateIdeaTransitionTitle,
  validateWorkflowTaskBodySection,
} from '../../lint/validators/idea-validator'
import {
  validateLinks,
  validatePrincipleHierarchyLinks,
  validateSemanticLinks,
} from '../../lint/validators/link-validator'
import {
  extractPrincipleRelationships,
  validateBidirectionalLinks,
  validateNoCycles,
  validatePrincipleHierarchySections,
} from '../../lint/validators/principle-hierarchy'
import type {
  PrincipleRelationships,
  Violation,
} from '../../lint/validators/types'
import type {
  CommandDependencies,
  CommandResult,
  FileSystem,
  GlobScanner,
} from '../types'

interface ScanResult {
  files: string[]
  exists: boolean
}

interface ValidationResult {
  violations: Violation[]
  didValidate: boolean
}

/**
 * Safely scans a directory for files, handling the case where the directory doesn't exist.
 * This avoids TOCTOU race conditions where a directory could be deleted between
 * an existence check and the scan operation.
 */
async function safeScanDir(
  glob: GlobScanner,
  dirPath: string
): Promise<ScanResult> {
  const files: string[] = []
  try {
    for await (const file of glob.scan(dirPath)) {
      files.push(file)
    }
    return { files, exists: true }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { files: [], exists: false }
    }
    throw error
  }
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

async function validateMarkdownLinks(
  fileSystem: FileSystem,
  dustPath: string,
  dustFiles: string[]
): Promise<Violation[]> {
  const violations: Violation[] = []
  for (const file of dustFiles) {
    if (!file.endsWith('.md')) continue
    const filePath = `${dustPath}/${file}`
    const content = await safeReadFile(fileSystem, filePath)
    if (content !== null) {
      const artifact = parseArtifact(filePath, content)
      violations.push(...validateLinks(artifact, fileSystem))
    }
  }
  return violations
}

async function validateContentFiles(
  glob: GlobScanner,
  fileSystem: FileSystem,
  dustPath: string
): Promise<Violation[]> {
  const contentDirs = ['principles', 'facts', 'ideas', 'tasks']
  const violations: Violation[] = []

  for (const dir of contentDirs) {
    const dirPath = `${dustPath}/${dir}`
    violations.push(
      ...(await validateContentDirectoryFiles(dirPath, fileSystem))
    )
  }

  for (const dir of contentDirs) {
    const dirPath = `${dustPath}/${dir}`
    const { files } = await safeScanDir(glob, dirPath)

    for (const file of files) {
      if (!file.endsWith('.md')) continue
      const filePath = `${dirPath}/${file}`
      const content = await safeReadFile(fileSystem, filePath)
      if (content === null) continue

      const artifact = parseArtifact(filePath, content)

      const openingSentenceViolation = validateOpeningSentence(artifact)
      if (openingSentenceViolation) violations.push(openingSentenceViolation)

      const lengthViolation = validateOpeningSentenceLength(artifact)
      if (lengthViolation) violations.push(lengthViolation)

      const titleViolation = validateTitleFilenameMatch(artifact)
      if (titleViolation) violations.push(titleViolation)
    }
  }

  return violations
}

async function validateIdeaFiles(
  glob: GlobScanner,
  fileSystem: FileSystem,
  ideasPath: string
): Promise<ValidationResult> {
  const { files } = await safeScanDir(glob, ideasPath)
  if (files.length === 0) return { violations: [], didValidate: false }

  const violations: Violation[] = []
  for (const file of files) {
    if (!file.endsWith('.md')) continue
    const filePath = `${ideasPath}/${file}`
    const content = await safeReadFile(fileSystem, filePath)
    if (content !== null) {
      const artifact = parseArtifact(filePath, content)
      violations.push(...validateIdeaOpenQuestions(artifact))
    }
  }
  return { violations, didValidate: true }
}

async function validateTaskFiles(
  glob: GlobScanner,
  fileSystem: FileSystem,
  tasksPath: string,
  ideasPath: string
): Promise<ValidationResult> {
  const { files } = await safeScanDir(glob, tasksPath)
  if (files.length === 0) return { violations: [], didValidate: false }

  const violations: Violation[] = []
  for (const file of files) {
    if (!file.endsWith('.md')) continue
    const filePath = `${tasksPath}/${file}`
    const content = await safeReadFile(fileSystem, filePath)
    if (content === null) continue

    const artifact = parseArtifact(filePath, content)

    const filenameViolation = validateFilename(filePath)
    if (filenameViolation) violations.push(filenameViolation)

    violations.push(...validateTaskHeadings(artifact))
    violations.push(...validateSemanticLinks(artifact))

    const imperativeViolation = validateImperativeOpeningSentence(artifact)
    if (imperativeViolation) violations.push(imperativeViolation)

    const ideaTransitionViolation = validateIdeaTransitionTitle(
      artifact,
      ideasPath,
      fileSystem
    )
    if (ideaTransitionViolation) violations.push(ideaTransitionViolation)

    violations.push(
      ...validateWorkflowTaskBodySection(artifact, ideasPath, fileSystem)
    )
  }
  return { violations, didValidate: true }
}

async function validatePrincipleFiles(
  glob: GlobScanner,
  fileSystem: FileSystem,
  principlesPath: string
): Promise<ValidationResult> {
  const { files } = await safeScanDir(glob, principlesPath)
  if (files.length === 0) return { violations: [], didValidate: false }

  const violations: Violation[] = []
  const allPrincipleRelationships: PrincipleRelationships[] = []

  for (const file of files) {
    if (!file.endsWith('.md')) continue
    const filePath = `${principlesPath}/${file}`
    const content = await safeReadFile(fileSystem, filePath)
    if (content === null) continue

    const artifact = parseArtifact(filePath, content)

    violations.push(...validatePrincipleHierarchySections(artifact))
    violations.push(...validatePrincipleHierarchyLinks(artifact))
    allPrincipleRelationships.push(extractPrincipleRelationships(artifact))
  }

  violations.push(...validateBidirectionalLinks(allPrincipleRelationships))
  violations.push(...validateNoCycles(allPrincipleRelationships))

  return { violations, didValidate: true }
}

export async function lintMarkdown(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, fileSystem, globScanner: glob } = dependencies
  const dustPath = `${context.cwd}/.dust`

  const dustScan = await safeScanDir(glob, dustPath)
  if (!dustScan.exists) {
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

  context.stdout('Validating links in .dust/...')
  violations.push(
    ...(await validateMarkdownLinks(fileSystem, dustPath, dustScan.files))
  )

  context.stdout('Validating content files...')
  violations.push(...(await validateContentFiles(glob, fileSystem, dustPath)))

  const ideasPath = `${dustPath}/ideas`
  const ideaResult = await validateIdeaFiles(glob, fileSystem, ideasPath)
  if (ideaResult.didValidate) {
    context.stdout('Validating idea files in .dust/ideas/...')
    violations.push(...ideaResult.violations)
  }

  const tasksPath = `${dustPath}/tasks`
  const taskResult = await validateTaskFiles(
    glob,
    fileSystem,
    tasksPath,
    ideasPath
  )
  if (taskResult.didValidate) {
    context.stdout('Validating task files in .dust/tasks/...')
    violations.push(...taskResult.violations)
  }

  const principlesPath = `${dustPath}/principles`
  const principleResult = await validatePrincipleFiles(
    glob,
    fileSystem,
    principlesPath
  )
  if (principleResult.didValidate) {
    context.stdout('Validating principle hierarchy in .dust/principles/...')
    violations.push(...principleResult.violations)
  }

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

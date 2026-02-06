/**
 * dust lint markdown - Run lint checks on .dust/ markdown files
 *
 * This module imports validation functions from @joshski/dust-validation
 * and provides CLI-specific integration with error handling.
 */

// Import validation functions from the validation package
import {
  extractGoalRelationships,
  extractOpeningSentence,
  extractTitle,
  type GoalRelationships,
  MARKDOWN_LINK_PATTERN,
  titleToFilename,
  type Violation,
  validateBidirectionalLinks,
  validateFilename,
  validateGoalHierarchyLinks,
  validateGoalHierarchySections,
  validateIdeaOpenQuestions,
  validateLinks,
  validateNoCycles,
  validateOpeningSentence,
  validateOpeningSentenceLength,
  validateSemanticLinks,
  validateTaskHeadings,
  validateTitleFilenameMatch,
} from '@joshski/dust-validation'

import type { CommandDependencies, CommandResult, GlobScanner } from '../types'

// Re-export validation functions for backwards compatibility
export {
  extractGoalRelationships,
  extractOpeningSentence,
  extractTitle,
  MARKDOWN_LINK_PATTERN,
  titleToFilename,
  validateBidirectionalLinks,
  validateFilename,
  validateGoalHierarchyLinks,
  validateGoalHierarchySections,
  validateIdeaOpenQuestions,
  validateLinks,
  validateNoCycles,
  validateOpeningSentence,
  validateOpeningSentenceLength,
  validateSemanticLinks,
  validateTaskHeadings,
  validateTitleFilenameMatch,
}

// Re-export types for backwards compatibility
export type { GoalRelationships, GlobScanner, Violation }

interface ScanResult {
  files: string[]
  exists: boolean
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

export async function lintMarkdown(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, fileSystem, globScanner: glob } = dependencies
  const dustPath = `${context.cwd}/.dust`

  // Try to scan the .dust directory - if it doesn't exist, report the error
  const dustScan = await safeScanDir(glob, dustPath)
  if (!dustScan.exists) {
    context.stderr('Error: .dust directory not found')
    context.stderr("Run 'dust init' to initialize a Dust repository")
    return { exitCode: 1 }
  }
  const dustFiles = dustScan.files

  const violations: Violation[] = []

  // Validate all markdown files for links
  context.stdout('Validating links in .dust/...')

  for (const file of dustFiles) {
    if (!file.endsWith('.md')) continue

    const filePath = `${dustPath}/${file}`
    try {
      const content = await fileSystem.readFile(filePath)
      violations.push(...validateLinks(filePath, content, fileSystem))
    } catch (error) {
      // File may have been deleted between scan and read - skip it
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  // Validate opening sentences and title-filename matching in all content directories
  const contentDirs = ['goals', 'facts', 'ideas', 'tasks']
  context.stdout('Validating content files...')

  for (const dir of contentDirs) {
    const dirPath = `${dustPath}/${dir}`
    const { files } = await safeScanDir(glob, dirPath)

    for (const file of files) {
      if (!file.endsWith('.md')) continue

      const filePath = `${dirPath}/${file}`
      let content: string
      try {
        content = await fileSystem.readFile(filePath)
      } catch (error) {
        // File may have been deleted between scan and read - skip it
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          continue
        }
        throw error
      }

      const openingSentenceViolation = validateOpeningSentence(
        filePath,
        content
      )
      if (openingSentenceViolation) {
        violations.push(openingSentenceViolation)
      }

      const openingSentenceLengthViolation = validateOpeningSentenceLength(
        filePath,
        content
      )
      if (openingSentenceLengthViolation) {
        violations.push(openingSentenceLengthViolation)
      }

      const titleFilenameViolation = validateTitleFilenameMatch(
        filePath,
        content
      )
      if (titleFilenameViolation) {
        violations.push(titleFilenameViolation)
      }
    }
  }

  // Validate idea files specifically
  const ideasPath = `${dustPath}/ideas`
  const { files: ideaFiles } = await safeScanDir(glob, ideasPath)
  if (ideaFiles.length > 0) {
    context.stdout('Validating idea files in .dust/ideas/...')

    for (const file of ideaFiles) {
      if (!file.endsWith('.md')) continue

      const filePath = `${ideasPath}/${file}`
      let content: string
      try {
        content = await fileSystem.readFile(filePath)
      } catch (error) {
        // File may have been deleted between scan and read - skip it
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          continue
        }
        throw error
      }

      violations.push(...validateIdeaOpenQuestions(filePath, content))
    }
  }

  // Validate task files specifically
  const tasksPath = `${dustPath}/tasks`
  const { files: taskFiles } = await safeScanDir(glob, tasksPath)
  if (taskFiles.length > 0) {
    context.stdout('Validating task files in .dust/tasks/...')

    for (const file of taskFiles) {
      if (!file.endsWith('.md')) continue

      const filePath = `${tasksPath}/${file}`
      let content: string
      try {
        content = await fileSystem.readFile(filePath)
      } catch (error) {
        // File may have been deleted between scan and read - skip it
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          continue
        }
        throw error
      }

      const filenameViolation = validateFilename(filePath)
      if (filenameViolation) {
        violations.push(filenameViolation)
      }

      violations.push(...validateTaskHeadings(filePath, content))
      violations.push(...validateSemanticLinks(filePath, content))
    }
  }

  // Validate goal files hierarchy
  const goalsPath = `${dustPath}/goals`
  const { files: goalFiles } = await safeScanDir(glob, goalsPath)
  if (goalFiles.length > 0) {
    context.stdout('Validating goal hierarchy in .dust/goals/...')

    const allGoalRelationships: GoalRelationships[] = []

    for (const file of goalFiles) {
      if (!file.endsWith('.md')) continue

      const filePath = `${goalsPath}/${file}`
      let content: string
      try {
        content = await fileSystem.readFile(filePath)
      } catch (error) {
        // File may have been deleted between scan and read - skip it
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          continue
        }
        throw error
      }

      violations.push(...validateGoalHierarchySections(filePath, content))
      violations.push(...validateGoalHierarchyLinks(filePath, content))

      allGoalRelationships.push(extractGoalRelationships(filePath, content))
    }

    violations.push(...validateBidirectionalLinks(allGoalRelationships))
    violations.push(...validateNoCycles(allGoalRelationships))
  }

  if (violations.length === 0) {
    context.stdout('All validations passed!')
    return { exitCode: 0 }
  }

  context.stderr(`Found ${violations.length} violation(s):`)
  context.stderr('')

  for (const v of violations) {
    const location = v.line ? `:${v.line}` : ''
    context.stderr(`  ${v.file}${location}`)
    context.stderr(`    ${v.message}`)
  }

  return { exitCode: 1 }
}

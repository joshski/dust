/**
 * Artifact patch validation API.
 *
 * Validates proposed artifact changes against existing .dust/ content
 * using the same validators as `dust lint`.
 */

import { isAbsolute, relative } from 'node:path'
import type { ReadableFileSystem } from '../filesystem/types'
import {
  validateImperativeOpeningSentence,
  validateOpeningSentence,
  validateOpeningSentenceLength,
  validateTaskHeadings,
} from '../lint/validators/content-validator'
import { validateContentDirectoryFiles } from '../lint/validators/directory-validator'
import {
  validateFilename,
  validateTitleFilenameMatch,
} from '../lint/validators/filename-validator'
import {
  validateIdeaOpenQuestions,
  validateIdeaTransitionTitle,
  validateWorkflowTaskBodySection,
} from '../lint/validators/idea-validator'
import {
  validateLinks,
  validatePrincipleHierarchyLinks,
  validateSemanticLinks,
} from '../lint/validators/link-validator'
import {
  extractPrincipleRelationships,
  validateBidirectionalLinks,
  validateNoCycles,
  validatePrincipleHierarchySections,
} from '../lint/validators/principle-hierarchy'
import type {
  PrincipleRelationships,
  Violation,
} from '../lint/validators/types'
import { createOverlayFileSystem } from './overlay-filesystem'

export type { Violation } from '../lint/validators/types'

export interface ArtifactPatch {
  files: Record<string, string | null> // relative paths → content, or null to delete
}

export interface ValidationResult {
  valid: boolean
  violations: Violation[]
}

export interface ValidatePatchOptions {
  cwd?: string
}

const ALLOWED_ROOT_DIRECTORIES = [
  'config',
  'facts',
  'ideas',
  'principles',
  'tasks',
]
const ALLOWED_ROOT_FILES = ['repository.md']
const ALLOWED_ROOT_PATHS = [
  ...ALLOWED_ROOT_DIRECTORIES.map(directory => `${directory}/`),
  ...ALLOWED_ROOT_FILES,
].join(', ')

function validatePatchRootEntries(
  fileSystem: ReadableFileSystem,
  dustPath: string,
  patch: ArtifactPatch
): Violation[] {
  const violations: Violation[] = []
  const sortedPaths = Object.keys(patch.files).sort()
  const reportedUnexpectedRootDirectories = new Set<string>()

  for (const relativePath of sortedPaths) {
    const content = patch.files[relativePath]
    if (content === null) continue

    const [rootEntry] = relativePath.split('/')
    if (!rootEntry) continue
    if (
      ALLOWED_ROOT_DIRECTORIES.includes(rootEntry) ||
      ALLOWED_ROOT_FILES.includes(rootEntry)
    ) {
      continue
    }

    const rootEntryPath = `${dustPath}/${rootEntry}`

    if (relativePath.includes('/')) {
      if (
        !reportedUnexpectedRootDirectories.has(rootEntry) &&
        !fileSystem.isDirectory(rootEntryPath)
      ) {
        violations.push({
          file: rootEntryPath,
          message: `Unexpected directory "${rootEntry}" in .dust/. Allowed root paths: ${ALLOWED_ROOT_PATHS}`,
        })
        reportedUnexpectedRootDirectories.add(rootEntry)
      }
      continue
    }

    violations.push({
      file: rootEntryPath,
      message: `Unexpected file "${rootEntry}" in .dust/. Allowed root paths: ${ALLOWED_ROOT_PATHS}`,
    })
  }

  return violations
}

function relativizeViolationFilePath(filePath: string, cwd: string): string {
  const relativePath = relative(cwd, filePath)
  if (
    relativePath === '' ||
    relativePath === '.' ||
    relativePath === '..' ||
    relativePath.startsWith('../') ||
    relativePath.startsWith('..\\')
  ) {
    return filePath
  }

  if (isAbsolute(relativePath)) {
    return filePath
  }

  return relativePath
}

function relativizeViolations(
  violations: Violation[],
  cwd: string
): Violation[] {
  return violations.map(violation => ({
    ...violation,
    file: relativizeViolationFilePath(violation.file, cwd),
  }))
}

/**
 * Validates a patch of artifact changes against existing .dust/ content.
 *
 * @param fileSystem - The existing filesystem (e.g. from createFileSystemEmulator)
 * @param dustPath - Absolute path to the .dust directory
 * @param patch - Proposed new/changed files, with paths relative to dustPath
 */
export async function validatePatch(
  fileSystem: ReadableFileSystem,
  dustPath: string,
  patch: ArtifactPatch,
  options: ValidatePatchOptions = {}
): Promise<ValidationResult> {
  const cwd = options.cwd ?? process.cwd()
  // Convert relative patch paths to absolute, separating additions from deletions
  const absolutePatchFiles = new Map<string, string>()
  const deletedPaths = new Set<string>()
  for (const [relativePath, content] of Object.entries(patch.files)) {
    const absolutePath = `${dustPath}/${relativePath}`
    if (content === null) {
      deletedPaths.add(absolutePath)
    } else {
      absolutePatchFiles.set(absolutePath, content)
    }
  }

  // Create overlay filesystem
  const overlayFs = createOverlayFileSystem(
    fileSystem,
    absolutePatchFiles,
    deletedPaths
  )

  const violations: Violation[] = []
  violations.push(...validatePatchRootEntries(fileSystem, dustPath, patch))

  const contentDirs = ['principles', 'facts', 'ideas', 'tasks']

  // Validate content directory files for directories that have patch files
  const patchDirs = new Set<string>()
  for (const relativePath of Object.keys(patch.files)) {
    const dir = relativePath.split('/')[0]
    if (contentDirs.includes(dir)) {
      patchDirs.add(dir)
    }
  }

  for (const dir of patchDirs) {
    violations.push(
      ...(await validateContentDirectoryFiles(`${dustPath}/${dir}`, overlayFs))
    )
  }

  // Run per-file validators only on added/changed patch files (not deletions)
  for (const [relativePath, content] of Object.entries(patch.files)) {
    if (content === null) continue
    if (!relativePath.endsWith('.md')) continue

    const filePath = `${dustPath}/${relativePath}`
    const dir = relativePath.split('/')[0]

    // Link validation (uses overlay fs so links to existing files resolve)
    violations.push(...validateLinks(filePath, content, overlayFs))

    // Content validation for content directories
    if (contentDirs.includes(dir)) {
      const openingSentence = validateOpeningSentence(filePath, content)
      if (openingSentence) violations.push(openingSentence)

      const openingSentenceLength = validateOpeningSentenceLength(
        filePath,
        content
      )
      if (openingSentenceLength) violations.push(openingSentenceLength)

      const titleFilename = validateTitleFilenameMatch(filePath, content)
      if (titleFilename) violations.push(titleFilename)
    }

    // Idea-specific validation
    if (dir === 'ideas') {
      violations.push(...validateIdeaOpenQuestions(filePath, content))
    }

    // Task-specific validation
    if (dir === 'tasks') {
      const filenameViolation = validateFilename(filePath)
      if (filenameViolation) violations.push(filenameViolation)

      violations.push(...validateTaskHeadings(filePath, content))
      violations.push(...validateSemanticLinks(filePath, content))

      const imperativeViolation = validateImperativeOpeningSentence(
        filePath,
        content
      )
      if (imperativeViolation) violations.push(imperativeViolation)

      const ideasPath = `${dustPath}/ideas`
      const ideaTransition = validateIdeaTransitionTitle(
        filePath,
        content,
        ideasPath,
        overlayFs
      )
      if (ideaTransition) violations.push(ideaTransition)

      violations.push(
        ...validateWorkflowTaskBodySection(
          filePath,
          content,
          ideasPath,
          overlayFs
        )
      )
    }

    // Principle-specific per-file validation
    if (dir === 'principles') {
      violations.push(...validatePrincipleHierarchySections(filePath, content))
      violations.push(...validatePrincipleHierarchyLinks(filePath, content))
    }
  }

  // Cross-file principle validation: gather ALL principles (existing + patched)
  const hasPrinciplePatches = Object.keys(patch.files).some(p =>
    p.startsWith('principles/')
  )
  if (hasPrinciplePatches) {
    const allRelationships: PrincipleRelationships[] = []

    // Gather existing principle files
    const principlesPath = `${dustPath}/principles`
    try {
      const existingFiles = await overlayFs.readdir(principlesPath)
      for (const file of existingFiles) {
        if (!file.endsWith('.md')) continue
        const filePath = `${principlesPath}/${file}`
        const content = await overlayFs.readFile(filePath)
        allRelationships.push(extractPrincipleRelationships(filePath, content))
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
      // principles directory may not exist
    }

    violations.push(...validateBidirectionalLinks(allRelationships))
    violations.push(...validateNoCycles(allRelationships))
  }

  return {
    valid: violations.length === 0,
    violations: relativizeViolations(violations, cwd),
  }
}

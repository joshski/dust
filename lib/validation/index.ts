/**
 * Artifact patch validation API.
 *
 * Validates proposed artifact changes against existing .dust/ content
 * using the same validators as `dust lint`.
 */

import { relative } from 'node:path'
import type { ReadableFileSystem } from '../filesystem/types'
import type { Violation } from '../lint/validators/types'
import { createOverlayFileSystem } from './overlay-filesystem'
import { parseArtifacts, validateArtifacts } from './validation-pipeline'

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
  const sortedPaths = Object.keys(patch.files).toSorted()
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

interface PatchFileSets {
  absolutePatchFiles: Map<string, string>
  deletedPaths: Set<string>
}

function parsePatchFiles(
  dustPath: string,
  patch: ArtifactPatch
): PatchFileSets {
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
  return { absolutePatchFiles, deletedPaths }
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
  const { absolutePatchFiles, deletedPaths } = parsePatchFiles(dustPath, patch)
  const overlayFs = createOverlayFileSystem(
    fileSystem,
    absolutePatchFiles,
    deletedPaths
  )

  const violations: Violation[] = []

  // Validate patch root entries (check for unexpected directories/files)
  violations.push(...validatePatchRootEntries(fileSystem, dustPath, patch))

  // Phase 1: Parse all artifacts using the overlay filesystem
  const { context, violations: parseViolations } = await parseArtifacts(
    overlayFs,
    dustPath
  )
  violations.push(...parseViolations)

  // Phase 2: Validate all artifacts
  violations.push(...validateArtifacts(context))

  return {
    valid: violations.length === 0,
    violations: relativizeViolations(violations, cwd),
  }
}

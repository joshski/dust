/**
 * Unified validation pipeline for .dust/ artifacts.
 *
 * Provides a two-phase validation approach:
 * 1. Parse phase: Read files once, parse into ParsedArtifact types, build an index
 * 2. Validate phase: Run all validators against parsed artifacts (no file I/O)
 *
 * Both `lintMarkdown()` and `validatePatch()` share this pipeline.
 */

import { ARTIFACT_TYPES } from '../artifacts/index'
import {
  type ParsedArtifact,
  parseArtifact,
} from '../artifacts/parsed-artifact'
import { isErrorCode } from '../filesystem/error-codes'
import type { ReadableFileSystem } from '../filesystem/types'
import { validateAuditHeadings } from '../lint/validators/audit-validator'
import {
  validateImperativeOpeningSentence,
  validateNoFrontMatter,
  validateOpeningSentence,
  validateOpeningSentenceLength,
  validateTaskHeadings,
  validateTaskType,
} from '../lint/validators/content-validator'
import { validateContentDirectoryFiles } from '../lint/validators/directory-validator'
import {
  validateFilename,
  validateTitleFilenameMatch,
} from '../lint/validators/filename-validator'
import { validateIdeaOpenQuestions } from '../lint/validators/idea-validator'
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

interface ValidationContext {
  artifacts: Map<string, ParsedArtifact>
  byType: {
    facts: ParsedArtifact[]
    ideas: ParsedArtifact[]
    principles: ParsedArtifact[]
    tasks: ParsedArtifact[]
  }
  rootFiles: ParsedArtifact[] // Root-level markdown files (e.g., repository.md)
  customAudits: ParsedArtifact[] // Custom audit files in .dust/config/audits/
  dustPath: string
  fileSystem: ReadableFileSystem
}

/**
 * Phase 1: Parse artifacts from the filesystem.
 *
 * Reads all markdown files from content directories, parses them into
 * ParsedArtifact types, and validates directory structure along the way.
 */
export async function parseArtifacts(
  fileSystem: ReadableFileSystem,
  dustPath: string
): Promise<{ context: ValidationContext; violations: Violation[] }> {
  const artifacts = new Map<string, ParsedArtifact>()
  const byType: ValidationContext['byType'] = {
    facts: [],
    ideas: [],
    principles: [],
    tasks: [],
  }
  const rootFiles: ParsedArtifact[] = []
  const customAudits: ParsedArtifact[] = []
  const violations: Violation[] = []

  // Parse root-level markdown files in .dust/
  let rootEntries: string[]
  try {
    rootEntries = await fileSystem.readdir(dustPath)
  } catch (error) {
    if (isErrorCode(error, 'ENOENT')) {
      rootEntries = []
    } else {
      throw error
    }
  }

  for (const entry of rootEntries) {
    if (!entry.endsWith('.md')) continue

    const filePath = `${dustPath}/${entry}`
    let content: string
    try {
      content = await fileSystem.readFile(filePath)
    } catch (error) {
      if (isErrorCode(error, 'ENOENT')) {
        continue
      }
      throw error
    }

    const artifact = parseArtifact(filePath, content)
    artifacts.set(filePath, artifact)
    rootFiles.push(artifact)
  }

  // Parse content directory files
  for (const dir of ARTIFACT_TYPES) {
    const dirPath = `${dustPath}/${dir}`

    // Validate content directory files (checks for hidden files, subdirs, non-md files)
    violations.push(
      ...(await validateContentDirectoryFiles(dirPath, fileSystem))
    )

    // Read and parse all markdown files in this directory
    let entries: string[]
    try {
      entries = await fileSystem.readdir(dirPath)
    } catch (error) {
      if (isErrorCode(error, 'ENOENT')) {
        continue
      }
      throw error
    }

    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue

      const filePath = `${dirPath}/${entry}`
      let content: string
      try {
        content = await fileSystem.readFile(filePath)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          continue
        }
        throw error
      }

      const artifact = parseArtifact(filePath, content)
      artifacts.set(filePath, artifact)
      byType[dir].push(artifact)
    }
  }

  // Parse custom audit files in .dust/config/audits/
  const auditsPath = `${dustPath}/config/audits`
  let auditEntries: string[]
  try {
    auditEntries = await fileSystem.readdir(auditsPath)
  } catch (error) {
    if (isErrorCode(error, 'ENOENT')) {
      auditEntries = []
    } else {
      throw error
    }
  }

  for (const entry of auditEntries) {
    if (!entry.endsWith('.md')) continue

    const filePath = `${auditsPath}/${entry}`
    let content: string
    try {
      content = await fileSystem.readFile(filePath)
    } catch (error) {
      if (isErrorCode(error, 'ENOENT')) {
        continue
      }
      throw error
    }

    const artifact = parseArtifact(filePath, content)
    artifacts.set(filePath, artifact)
    customAudits.push(artifact)
  }

  return {
    context: {
      artifacts,
      byType,
      rootFiles,
      customAudits,
      dustPath,
      fileSystem,
    },
    violations,
  }
}

/**
 * Phase 2: Validate all parsed artifacts.
 *
 * Runs all validators against the parsed artifacts. This phase does
 * minimal file I/O - only for link target verification.
 */
export function validateArtifacts(context: ValidationContext): Violation[] {
  const violations: Violation[] = []
  const { byType, rootFiles, customAudits, fileSystem } = context

  // Validate links in root-level markdown files
  for (const artifact of rootFiles) {
    violations.push(...validateLinks(artifact, fileSystem))
  }

  // Validate all content files (opening sentence, title-filename match)
  for (const artifacts of Object.values(byType)) {
    for (const artifact of artifacts) {
      const frontMatterViolation = validateNoFrontMatter(artifact)
      if (frontMatterViolation) violations.push(frontMatterViolation)

      const openingSentenceViolation = validateOpeningSentence(artifact)
      if (openingSentenceViolation) violations.push(openingSentenceViolation)

      const lengthViolation = validateOpeningSentenceLength(artifact)
      if (lengthViolation) violations.push(lengthViolation)

      const titleViolation = validateTitleFilenameMatch(artifact)
      if (titleViolation) violations.push(titleViolation)

      // Validate links for all markdown files
      violations.push(...validateLinks(artifact, fileSystem))
    }
  }

  // Validate idea files
  for (const artifact of byType.ideas) {
    violations.push(...validateIdeaOpenQuestions(artifact))
  }

  // Validate task files
  for (const artifact of byType.tasks) {
    const filenameViolation = validateFilename(artifact.filePath)
    if (filenameViolation) violations.push(filenameViolation)

    violations.push(...validateTaskHeadings(artifact))
    violations.push(...validateSemanticLinks(artifact))

    const imperativeViolation = validateImperativeOpeningSentence(artifact)
    if (imperativeViolation) violations.push(imperativeViolation)

    const taskTypeViolation = validateTaskType(artifact)
    if (taskTypeViolation) violations.push(taskTypeViolation)

    // Title prefix validation removed - prefixes are now cosmetic
    // validateIdeaTransitionTitle and validateWorkflowTaskBodySection
    // no longer perform validation
  }

  // Validate principle files
  const allPrincipleRelationships: PrincipleRelationships[] = []
  for (const artifact of byType.principles) {
    violations.push(...validatePrincipleHierarchySections(artifact))
    violations.push(...validatePrincipleHierarchyLinks(artifact))
    allPrincipleRelationships.push(extractPrincipleRelationships(artifact))
  }

  // Cross-file principle validation
  violations.push(...validateBidirectionalLinks(allPrincipleRelationships))
  violations.push(...validateNoCycles(allPrincipleRelationships))

  // Validate custom audit files
  for (const artifact of customAudits) {
    const filenameViolation = validateFilename(artifact.filePath)
    if (filenameViolation) violations.push(filenameViolation)

    const openingSentenceViolation = validateOpeningSentence(artifact)
    if (openingSentenceViolation) violations.push(openingSentenceViolation)

    const lengthViolation = validateOpeningSentenceLength(artifact)
    if (lengthViolation) violations.push(lengthViolation)

    violations.push(...validateAuditHeadings(artifact))
  }

  return violations
}

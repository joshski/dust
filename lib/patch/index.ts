/**
 * Artifact patch building API.
 *
 * Provides functions for building multi-file artifact patches from
 * structured objects with automatic validation.
 */

import { ARTIFACT_TYPES } from '../artifacts/index'
import type { ReadableFileSystem } from '../filesystem/types'
import type { Violation } from '../lint/validators/types'
import { type ArtifactPatch, validatePatch } from '../validation/index'
import { MARKDOWN_LINK_PATTERN } from '../markdown/markdown-utilities'
import { type FactInput, buildFactFiles, serializeFact } from './fact'
import { type IdeaInput, buildIdeaFiles, serializeIdea } from './idea'
import {
  type PrincipleInput,
  buildPrincipleFiles,
  serializePrinciple,
} from './principle'
import {
  type TaskInput,
  type StandardTaskInput,
  type WorkflowTaskInput,
  buildTaskFiles,
  serializeTask,
} from './task'

// Re-export types and functions
export { serializeFact } from './fact'
export type { FactInput } from './fact'
export { serializeIdea } from './idea'
export type { IdeaInput, IdeaOpenQuestion } from './idea'
export { serializePrinciple } from './principle'
export type { PrincipleInput } from './principle'
export { serializeTask } from './task'
export type { TaskInput, StandardTaskInput, WorkflowTaskInput } from './task'
export type { ArtifactPatch, Violation }

export interface ArtifactPatchInput {
  facts?: Record<string, FactInput | null>
  ideas?: Record<string, IdeaInput | null>
  principles?: Record<string, PrincipleInput | null>
  tasks?: Record<string, TaskInput | null>
}

export type ArtifactType = 'fact' | 'idea' | 'principle' | 'task'

export interface ArtifactPreview {
  type: ArtifactType
  slug: string
  action: 'create' | 'update' | 'delete'
  content: string | null
}

export interface BuildArtifactPatchResult {
  valid: boolean
  violations: Violation[]
  patch: ArtifactPatch
  previews: ArtifactPreview[]
}

interface ValidatePatchOptions {
  cwd?: string
}

interface PrincipleRelationship {
  slug: string
  parentPrinciple: string | null
  subPrinciples: string[]
}

/**
 * Validates bidirectional consistency of principle hierarchy relationships.
 * Returns violations if parent/child relationships are not consistent.
 */
function validatePrincipleHierarchy(
  principles: Record<string, PrincipleInput>,
  existingPrinciples: Map<string, PrincipleRelationship>,
  deletedPrinciples: Set<string>
): Violation[] {
  const violations: Violation[] = []

  // Build a combined view of all principles (existing + patch)
  const allPrinciples = new Map<string, PrincipleRelationship>()

  // Start with existing principles (not being deleted)
  for (const [slug, rel] of existingPrinciples) {
    if (!deletedPrinciples.has(slug)) {
      allPrinciples.set(slug, rel)
    }
  }

  // Overlay patch principles
  for (const [slug, input] of Object.entries(principles)) {
    allPrinciples.set(slug, {
      slug,
      parentPrinciple: input.parentPrinciple ?? null,
      subPrinciples: input.subPrinciples ?? [],
    })
  }

  // Validate bidirectional consistency
  for (const [slug, rel] of allPrinciples) {
    const filePath = `principles/${slug}.md`

    // Check parent → child consistency
    if (rel.parentPrinciple !== null) {
      const parent = allPrinciples.get(rel.parentPrinciple)
      if (parent && !parent.subPrinciples.includes(slug)) {
        violations.push({
          file: filePath,
          message: `Parent principle "${rel.parentPrinciple}" does not list this principle as a sub-principle`,
        })
      }
    }

    // Check child → parent consistency
    for (const subSlug of rel.subPrinciples) {
      const child = allPrinciples.get(subSlug)
      if (child && child.parentPrinciple !== slug) {
        violations.push({
          file: filePath,
          message: `Sub-principle "${subSlug}" does not list this principle as its parent`,
        })
      }
    }
  }

  return violations
}

/**
 * Parses existing principle files to extract hierarchy relationships.
 */
async function loadExistingPrincipleRelationships(
  fileSystem: ReadableFileSystem,
  dustPath: string
): Promise<Map<string, PrincipleRelationship>> {
  const relationships = new Map<string, PrincipleRelationship>()
  const principlesDir = `${dustPath}/principles`

  let entries: string[]
  try {
    entries = await fileSystem.readdir(principlesDir)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return relationships
    }
    throw error
  }

  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue

    const slug = entry.slice(0, -3) // Remove .md extension
    const filePath = `${principlesDir}/${entry}`
    const content = await fileSystem.readFile(filePath)
    const rel = parsePrincipleRelationships(content, slug)
    relationships.set(slug, rel)
  }

  return relationships
}

/**
 * Extracts parent and sub-principle slugs from principle markdown content.
 */
function parsePrincipleRelationships(
  content: string,
  slug: string
): PrincipleRelationship {
  const parentPrinciple = extractSingleSlugFromSection(
    content,
    'Parent Principle'
  )
  const subPrinciples = extractSlugsFromSection(content, 'Sub-Principles')

  return { slug, parentPrinciple, subPrinciples }
}

/**
 * Extracts a single slug from a section, or null if none/multiple exist.
 */
function extractSingleSlugFromSection(
  content: string,
  sectionHeading: string
): string | null {
  const slugs = extractSlugsFromSection(content, sectionHeading)
  return slugs.length === 1 ? slugs[0] : null
}

/**
 * Extracts slugs from markdown links in a section.
 */
function extractSlugsFromSection(
  content: string,
  sectionHeading: string
): string[] {
  const lines = content.split('\n')
  const slugs: string[] = []
  let inSection = false

  for (const line of lines) {
    if (line.startsWith('## ')) {
      inSection = line.trimEnd() === `## ${sectionHeading}`
      continue
    }

    if (!inSection) continue
    if (line.startsWith('# ')) break

    const linkMatch = line.match(MARKDOWN_LINK_PATTERN)
    if (linkMatch) {
      const target = linkMatch[2]
      // Extract slug from relative path like 'some-principle.md'
      const slugMatch = target.match(/([^/]+)\.md$/)
      if (slugMatch) {
        slugs.push(slugMatch[1])
      }
    }
  }

  return slugs
}

/**
 * Updates principle hierarchy when a principle is deleted.
 * Returns updated principle content for parent and child principles.
 *
 * @param content - The principle file content
 * @param deletedPaths - Set of deleted paths (e.g., 'principles/child.md')
 * @param sourceFilePath - The path of the source file relative to dust directory (e.g., 'principles/parent.md')
 */
function updatePrincipleHierarchyOnDeletion(
  content: string,
  deletedPaths: Set<string>,
  sourceFilePath: string
): string {
  // Remove links to deleted principles and clean up empty sections
  return cleanupPrincipleHierarchySections(
    removeLinksToDeletedPaths(content, deletedPaths, sourceFilePath)
  )
}

/**
 * Cleans up Parent Principle and Sub-Principles sections after link removal.
 */
function cleanupPrincipleHierarchySections(content: string): string {
  const lines = content.split('\n')
  const result: string[] = []
  let inHierarchySection = false
  let hierarchySectionHeading = ''
  let sectionItems: string[] = []
  let hasValidContent = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      // End of previous hierarchy section
      if (inHierarchySection) {
        result.push(hierarchySectionHeading, '')
        if (hasValidContent) {
          result.push(
            ...sectionItems.filter(item => MARKDOWN_LINK_PATTERN.test(item))
          )
        } else {
          result.push('- (none)')
        }
        inHierarchySection = false
        sectionItems = []
        hasValidContent = false
      }

      const heading = line.trimEnd()
      if (
        heading === '## Parent Principle' ||
        heading === '## Sub-Principles'
      ) {
        inHierarchySection = true
        hierarchySectionHeading = heading
        continue
      }
    }

    if (inHierarchySection) {
      if (line.startsWith('- ')) {
        sectionItems.push(line)
        if (MARKDOWN_LINK_PATTERN.test(line)) {
          hasValidContent = true
        }
      } else if (line.trim() === '(none)') {
        // Already marked as none, ignore
      } else if (line.trim() !== '') {
        sectionItems.push(line)
        hasValidContent = true
      }
      continue
    }

    result.push(line)
  }

  // Handle hierarchy section at end of file
  if (inHierarchySection) {
    result.push(hierarchySectionHeading, '')
    if (hasValidContent) {
      result.push(
        ...sectionItems.filter(item => MARKDOWN_LINK_PATTERN.test(item))
      )
    } else {
      result.push('- (none)')
    }
  }

  return result.join('\n')
}

/**
 * Scans all artifacts for markdown links to deleted files and returns
 * updated content with those links removed.
 */
async function findReferencesToDeletedPaths(
  fileSystem: ReadableFileSystem,
  dustPath: string,
  deletedPaths: Set<string>
): Promise<Map<string, string>> {
  const updates = new Map<string, string>()

  for (const dir of ARTIFACT_TYPES) {
    const dirPath = `${dustPath}/${dir}`

    let entries: string[]
    try {
      entries = await fileSystem.readdir(dirPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue
      }
      throw error
    }

    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue

      const filePath = `${dirPath}/${entry}`
      const relativePath = `${dir}/${entry}`

      // Skip files that are being deleted
      if (deletedPaths.has(relativePath)) continue

      const content = await fileSystem.readFile(filePath)
      const updatedContent = removeLinksToDeletedPaths(
        content,
        deletedPaths,
        relativePath
      )

      if (updatedContent !== content) {
        updates.set(relativePath, updatedContent)
      }
    }
  }

  return updates
}

/**
 * Removes markdown links that point to any of the deleted paths.
 *
 * @param content - The markdown content to process
 * @param deletedPaths - Set of paths relative to dust directory (e.g., 'facts/my-fact.md')
 * @param sourceFilePath - The path of the source file relative to dust directory
 */
function removeLinksToDeletedPaths(
  content: string,
  deletedPaths: Set<string>,
  sourceFilePath: string
): string {
  const globalPattern = new RegExp(MARKDOWN_LINK_PATTERN.source, 'g')
  const sourceDir = sourceFilePath.substring(0, sourceFilePath.lastIndexOf('/'))

  let linksRemoved = false
  let result = content.replace(globalPattern, (match, text, target) => {
    // Normalize the target path for comparison
    const normalizedTarget = normalizeTargetPath(target, sourceDir)

    if (normalizedTarget !== null && deletedPaths.has(normalizedTarget)) {
      // Replace the link with just the text
      linksRemoved = true
      return text
    }

    return match
  })

  // Only clean up Blocked By sections if we actually removed a link
  if (linksRemoved) {
    result = cleanupBlockedBySection(result)
  }

  return result
}

/**
 * Filters blocked-by items to keep only those containing links.
 */
function filterBlockedByItems(items: string[]): string[] {
  return items.filter(item => MARKDOWN_LINK_PATTERN.test(item))
}

/**
 * Renders a cleaned-up Blocked By section.
 */
function renderBlockedByContent(
  heading: string,
  items: string[],
  hasRealContent: boolean
): string[] {
  const result = [heading]
  if (hasRealContent) {
    result.push(...filterBlockedByItems(items))
  } else {
    result.push('', '(none)')
  }
  return result
}

/**
 * Cleans up ## Blocked By sections by removing orphaned bullet points
 * (bullets that only contain plain text from removed links) and
 * ensuring an empty section shows (none).
 */
function cleanupBlockedBySection(content: string): string {
  const lines = content.split('\n')
  const result: string[] = []
  let inBlockedBy = false
  let blockedByStart = -1
  let blockedByItems: string[] = []
  let hasRealContent = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check for section headings
    if (line.startsWith('## ')) {
      // End of previous Blocked By section
      if (inBlockedBy) {
        const sectionLines = renderBlockedByContent(
          lines[blockedByStart],
          blockedByItems,
          hasRealContent
        )
        result.push(...sectionLines)
        inBlockedBy = false
        blockedByItems = []
        hasRealContent = false
      }

      // Check if this is a Blocked By section
      if (line.trimEnd() === '## Blocked By') {
        inBlockedBy = true
        blockedByStart = i
        continue
      }
    }

    if (inBlockedBy) {
      // Collect lines in the Blocked By section
      if (line.startsWith('- ')) {
        blockedByItems.push(line)
        if (MARKDOWN_LINK_PATTERN.test(line)) {
          hasRealContent = true
        }
      } else if (line.trim() === '(none)') {
        // Already marked as none
        hasRealContent = false
      } else if (line.trim() !== '') {
        // Some other content
        blockedByItems.push(line)
        hasRealContent = true
      }
      continue
    }

    result.push(line)
  }

  // Handle Blocked By section at end of file
  if (inBlockedBy) {
    const sectionLines = renderBlockedByContent(
      lines[blockedByStart],
      blockedByItems,
      hasRealContent
    )
    result.push(...sectionLines)
  }

  return result.join('\n')
}

/**
 * Normalizes a link target to a path relative to the dust directory.
 * Returns null if the target doesn't point to a dust artifact.
 *
 * @param target - The link target from markdown
 * @param sourceDir - The directory of the source file relative to dust directory
 */
function normalizeTargetPath(target: string, sourceDir: string): string | null {
  // Skip external URLs
  if (target.startsWith('http://') || target.startsWith('https://')) {
    return null
  }

  // Handle relative paths like ../facts/my-fact.md or ./something/../facts/my-fact.md
  if (target.startsWith('../') || target.startsWith('./')) {
    // Resolve the path relative to the source directory
    const parts = [...sourceDir.split('/'), ...target.split('/')]
    const resolved: string[] = []
    for (const part of parts) {
      if (part === '..') {
        resolved.pop()
      } else if (part !== '.' && part !== '') {
        resolved.push(part)
      }
    }
    return resolved.join('/')
  }

  // Handle simple relative paths (same directory) like "target-fact.md"
  if (!target.includes('/')) {
    return `${sourceDir}/${target}`
  }

  // Handle paths that are already relative to dust directory
  if (
    target.startsWith('facts/') ||
    target.startsWith('ideas/') ||
    target.startsWith('tasks/') ||
    target.startsWith('principles/')
  ) {
    return target
  }

  return null
}

interface PatchAccumulator {
  files: Record<string, string | null>
  deletedPaths: Set<string>
}

/**
 * Parses artifact type and slug from a file path.
 * E.g., 'facts/my-fact.md' → { type: 'fact', slug: 'my-fact' }
 */
function parseArtifactPath(
  path: string
): { type: ArtifactType; slug: string } | null {
  const match = path.match(/^(facts|ideas|principles|tasks)\/([^/]+)\.md$/)
  /* v8 ignore start -- defensive guard; all patch files are artifact paths */
  if (!match) return null
  /* v8 ignore stop */

  const dirToType: Record<string, ArtifactType> = {
    facts: 'fact',
    ideas: 'idea',
    principles: 'principle',
    tasks: 'task',
  }

  return {
    type: dirToType[match[1]],
    slug: match[2],
  }
}

/**
 * Builds preview objects from patch files.
 * For create vs update determination, checks filesystem existence.
 */
async function buildPreviews(
  fileSystem: ReadableFileSystem,
  dustPath: string,
  files: Record<string, string | null>
): Promise<ArtifactPreview[]> {
  const previews: ArtifactPreview[] = []

  for (const [path, content] of Object.entries(files)) {
    const parsed = parseArtifactPath(path)
    /* v8 ignore start -- defensive guard; all patch files are artifact paths */
    if (!parsed) continue
    /* v8 ignore stop */

    if (content === null) {
      previews.push({
        type: parsed.type,
        slug: parsed.slug,
        action: 'delete',
        content: null,
      })
    } else {
      const exists = await fileExists(fileSystem, `${dustPath}/${path}`)
      previews.push({
        type: parsed.type,
        slug: parsed.slug,
        action: exists ? 'update' : 'create',
        content,
      })
    }
  }

  return previews
}

/**
 * Checks if a file exists in the filesystem.
 */
async function fileExists(
  fileSystem: ReadableFileSystem,
  path: string
): Promise<boolean> {
  try {
    await fileSystem.readFile(path)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false
    }
    throw error
  }
}

function processFacts(
  facts: Record<string, FactInput | null>,
  accumulator: PatchAccumulator
): void {
  for (const [slug, factInput] of Object.entries(facts)) {
    if (factInput === null) {
      const relativePath = `facts/${slug}.md`
      accumulator.files[relativePath] = null
      accumulator.deletedPaths.add(relativePath)
    } else {
      const factFiles = buildFactFiles(factInput, slug)
      Object.assign(accumulator.files, factFiles)
    }
  }
}

function processTasks(
  tasks: Record<string, TaskInput | null>,
  accumulator: PatchAccumulator
): void {
  for (const [slug, taskInput] of Object.entries(tasks)) {
    if (taskInput === null) {
      const relativePath = `tasks/${slug}.md`
      accumulator.files[relativePath] = null
      accumulator.deletedPaths.add(relativePath)
    } else {
      const taskFiles = buildTaskFiles(taskInput, slug)
      Object.assign(accumulator.files, taskFiles)
    }
  }
}

function processIdeas(
  ideas: Record<string, IdeaInput | null>,
  accumulator: PatchAccumulator
): void {
  for (const [slug, ideaInput] of Object.entries(ideas)) {
    if (ideaInput === null) {
      const relativePath = `ideas/${slug}.md`
      accumulator.files[relativePath] = null
      accumulator.deletedPaths.add(relativePath)
    } else {
      const ideaFiles = buildIdeaFiles(ideaInput, slug)
      Object.assign(accumulator.files, ideaFiles)
    }
  }
}

interface ProcessPrinciplesResult {
  deletedSlugs: Set<string>
  hierarchyViolations: Violation[]
}

async function processPrinciples(
  fileSystem: ReadableFileSystem,
  dustPath: string,
  principles: Record<string, PrincipleInput | null>,
  accumulator: PatchAccumulator
): Promise<ProcessPrinciplesResult> {
  const deletedSlugs = new Set<string>()
  const hierarchyViolations: Violation[] = []

  const existingPrinciples = await loadExistingPrincipleRelationships(
    fileSystem,
    dustPath
  )

  const principleUpdates: Record<string, PrincipleInput> = {}
  for (const [slug, principleInput] of Object.entries(principles)) {
    if (principleInput === null) {
      const relativePath = `principles/${slug}.md`
      accumulator.files[relativePath] = null
      accumulator.deletedPaths.add(relativePath)
      deletedSlugs.add(slug)
    } else {
      principleUpdates[slug] = principleInput
      const principleFiles = buildPrincipleFiles(principleInput, slug)
      Object.assign(accumulator.files, principleFiles)
    }
  }

  if (Object.keys(principleUpdates).length > 0) {
    hierarchyViolations.push(
      ...validatePrincipleHierarchy(
        principleUpdates,
        existingPrinciples,
        deletedSlugs
      )
    )
  }

  if (deletedSlugs.size > 0) {
    await updateRelatedPrinciplesOnDeletion(
      fileSystem,
      dustPath,
      existingPrinciples,
      deletedSlugs,
      accumulator
    )
  }

  return { deletedSlugs, hierarchyViolations }
}

async function updateRelatedPrinciplesOnDeletion(
  fileSystem: ReadableFileSystem,
  dustPath: string,
  existingPrinciples: Map<string, PrincipleRelationship>,
  deletedSlugs: Set<string>,
  accumulator: PatchAccumulator
): Promise<void> {
  const deletedPaths = new Set(
    [...deletedSlugs].map(slug => `principles/${slug}.md`)
  )

  for (const [slug, rel] of existingPrinciples) {
    if (deletedSlugs.has(slug)) continue

    const relativePath = `principles/${slug}.md`
    if (relativePath in accumulator.files) continue

    const referencesDeleted =
      (rel.parentPrinciple !== null && deletedSlugs.has(rel.parentPrinciple)) ||
      rel.subPrinciples.some(sub => deletedSlugs.has(sub))

    if (referencesDeleted) {
      const filePath = `${dustPath}/${relativePath}`
      const content = await fileSystem.readFile(filePath)
      const updatedContent = updatePrincipleHierarchyOnDeletion(
        content,
        deletedPaths,
        relativePath
      )
      if (updatedContent !== content) {
        accumulator.files[relativePath] = updatedContent
      }
    }
  }
}

/**
 * Builds an artifact patch from structured input objects.
 *
 * @param fileSystem - The existing filesystem
 * @param dustPath - Absolute path to the .dust directory
 * @param input - Structured artifact input objects
 * @param options - Optional configuration (e.g., cwd for relative violation paths)
 * @returns Result with validation status and the patch
 *
 * @example
 * const result = await buildArtifactPatch(fileSystem, '.dust', {
 *   facts: {
 *     'new-fact': { title: 'New Fact', body: 'Description here.' },
 *     'old-fact': null,  // delete
 *   },
 * })
 */
export async function buildArtifactPatch(
  fileSystem: ReadableFileSystem,
  dustPath: string,
  input: ArtifactPatchInput,
  options: ValidatePatchOptions = {}
): Promise<BuildArtifactPatchResult> {
  const accumulator: PatchAccumulator = {
    files: {},
    deletedPaths: new Set<string>(),
  }
  let hierarchyViolations: Violation[] = []

  if (input.facts) {
    processFacts(input.facts, accumulator)
  }

  if (input.ideas) {
    processIdeas(input.ideas, accumulator)
  }

  if (input.principles) {
    const result = await processPrinciples(
      fileSystem,
      dustPath,
      input.principles,
      accumulator
    )
    hierarchyViolations = result.hierarchyViolations
  }

  if (input.tasks) {
    processTasks(input.tasks, accumulator)
  }

  if (accumulator.deletedPaths.size > 0) {
    const referenceUpdates = await findReferencesToDeletedPaths(
      fileSystem,
      dustPath,
      accumulator.deletedPaths
    )
    for (const [path, content] of referenceUpdates) {
      if (!(path in accumulator.files)) {
        accumulator.files[path] = content
      }
    }
  }

  const patch: ArtifactPatch = { files: accumulator.files }
  const validationResult = await validatePatch(
    fileSystem,
    dustPath,
    patch,
    options
  )

  const previews = await buildPreviews(fileSystem, dustPath, accumulator.files)

  return {
    valid: validationResult.valid && hierarchyViolations.length === 0,
    violations: [...hierarchyViolations, ...validationResult.violations],
    patch,
    previews,
  }
}

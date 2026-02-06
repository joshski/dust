/**
 * @joshski/dust-validation
 *
 * Artifact validation for dust markdown files.
 * This package provides validation functions for .dust/ directory structure
 * and content with zero runtime dependencies.
 */

import { dirname, resolve } from 'node:path'

// ============================================================================
// Markdown Utilities
// ============================================================================

/**
 * Extracts the title from markdown content (first H1 heading)
 */
export function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

/**
 * Pattern for matching markdown links: [text](url)
 * Note: Create a new RegExp with 'g' flag for global matching:
 * `new RegExp(MARKDOWN_LINK_PATTERN.source, 'g')`
 */
export const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/

/**
 * Extracts the first sentence from the first paragraph after the H1 heading.
 * Returns null if no valid opening paragraph exists.
 *
 * A valid opening paragraph:
 * - Appears on the first non-blank line after the H1 heading
 * - Is a plain paragraph (not a heading, list item, or code block)
 * - Starts with a sentence that ends in `.` `?` or `!`
 */
export function extractOpeningSentence(content: string): string | null {
  const lines = content.split('\n')

  // Find the H1 heading
  let h1Index = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^#\s+.+$/)) {
      h1Index = i
      break
    }
  }

  if (h1Index === -1) {
    return null
  }

  // Find the first non-blank line after the H1
  let paragraphStart = -1
  for (let i = h1Index + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line !== '') {
      paragraphStart = i
      break
    }
  }

  if (paragraphStart === -1) {
    return null
  }

  const firstLine = lines[paragraphStart]
  const trimmedFirstLine = firstLine.trim()

  // Check if it's a plain paragraph (not heading, list item, or code block)
  if (
    trimmedFirstLine.startsWith('#') ||
    trimmedFirstLine.startsWith('-') ||
    trimmedFirstLine.startsWith('*') ||
    trimmedFirstLine.startsWith('+') ||
    trimmedFirstLine.match(/^\d+\./) ||
    trimmedFirstLine.startsWith('```') ||
    trimmedFirstLine.startsWith('>')
  ) {
    return null
  }

  // Collect the full paragraph (until blank line or end)
  let paragraph = ''
  for (let i = paragraphStart; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '') break
    // Stop if we hit another structural element
    if (
      line.startsWith('#') ||
      line.startsWith('```') ||
      line.startsWith('>')
    ) {
      break
    }
    paragraph += (paragraph ? ' ' : '') + line
  }

  // Extract the first sentence (ends with . ? or !)
  const sentenceMatch = paragraph.match(/^(.+?[.?!])(?:\s|$)/)
  if (!sentenceMatch) {
    return null
  }

  return sentenceMatch[1]
}

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a validation violation found in a file
 */
export interface Violation {
  file: string
  message: string
  line?: number
}

/**
 * Represents the goal hierarchy relationships for a goal file
 */
export interface GoalRelationships {
  filePath: string
  parentGoals: string[]
  subGoals: string[]
}

/**
 * File system abstraction for validation functions
 */
export interface FileSystem {
  exists: (path: string) => boolean
  readFile: (path: string) => Promise<string>
}

/**
 * Glob scanner abstraction for iterating over files
 */
export interface GlobScanner {
  scan: (dir: string) => AsyncIterable<string>
}

/**
 * Context for running validation commands
 */
export interface CommandContext {
  cwd: string
  stdout: (message: string) => void
  stderr: (message: string) => void
}

// ============================================================================
// Constants
// ============================================================================

const REQUIRED_HEADINGS = ['## Goals', '## Blocked By', '## Definition of Done']
const REQUIRED_GOAL_HEADINGS = ['## Parent Goal', '## Sub-Goals']
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*\.md$/
const MAX_OPENING_SENTENCE_LENGTH = 150

interface SemanticRule {
  section: string
  requiredPath: string
  description: string
}

const SEMANTIC_RULES: SemanticRule[] = [
  {
    section: '## Goals',
    requiredPath: '/.dust/goals/',
    description: 'goal',
  },
  {
    section: '## Blocked By',
    requiredPath: '/.dust/tasks/',
    description: 'task',
  },
]

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates that a filename follows slug-style naming (lowercase, hyphenated)
 */
export function validateFilename(filePath: string): Violation | null {
  const parts = filePath.split('/')
  const filename = parts[parts.length - 1]
  if (!SLUG_PATTERN.test(filename)) {
    return {
      file: filePath,
      message: `Filename "${filename}" does not match slug-style naming`,
    }
  }
  return null
}

/**
 * Converts a markdown title to the expected filename using deterministic rules:
 * 1. Convert to lowercase
 * 2. Replace dots with hyphens (before removing other special chars)
 * 3. Remove characters that aren't alphanumeric, spaces, or hyphens
 * 4. Replace spaces with hyphens
 * 5. Collapse multiple consecutive hyphens
 * 6. Add .md extension
 */
export function titleToFilename(title: string): string {
  return `${title
    .toLowerCase()
    .replace(/\./g, '-')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')}.md`
}

/**
 * Validates that a file's name matches its H1 title
 */
export function validateTitleFilenameMatch(
  filePath: string,
  content: string
): Violation | null {
  const title = extractTitle(content)
  if (!title) {
    return null // No title to validate against
  }

  const parts = filePath.split('/')
  const actualFilename = parts[parts.length - 1]
  const expectedFilename = titleToFilename(title)

  if (actualFilename !== expectedFilename) {
    return {
      file: filePath,
      message: `Filename "${actualFilename}" does not match title "${title}" (expected "${expectedFilename}")`,
    }
  }

  return null
}

/**
 * Validates that a file has an opening sentence after the H1 heading
 */
export function validateOpeningSentence(
  filePath: string,
  content: string
): Violation | null {
  const openingSentence = extractOpeningSentence(content)
  if (!openingSentence) {
    return {
      file: filePath,
      message: 'Missing or malformed opening sentence after H1 heading',
    }
  }
  return null
}

/**
 * Validates that the opening sentence does not exceed the maximum length
 */
export function validateOpeningSentenceLength(
  filePath: string,
  content: string
): Violation | null {
  const openingSentence = extractOpeningSentence(content)
  if (!openingSentence) {
    return null // Missing sentence is handled by validateOpeningSentence
  }
  if (openingSentence.length > MAX_OPENING_SENTENCE_LENGTH) {
    return {
      file: filePath,
      message: `Opening sentence is ${openingSentence.length} characters (max ${MAX_OPENING_SENTENCE_LENGTH}). Split into multiple sentences; only the first sentence is checked.`,
    }
  }
  return null
}

/**
 * Validates that a task file has all required headings
 */
export function validateTaskHeadings(
  filePath: string,
  content: string
): Violation[] {
  const violations: Violation[] = []
  for (const heading of REQUIRED_HEADINGS) {
    if (!content.includes(heading)) {
      violations.push({
        file: filePath,
        message: `Missing required heading: "${heading}"`,
      })
    }
  }
  return violations
}

/**
 * Validates that all local markdown links point to existing files
 */
export function validateLinks(
  filePath: string,
  content: string,
  fileSystem: FileSystem
): Violation[] {
  const violations: Violation[] = []
  const lines = content.split('\n')
  const fileDir = dirname(filePath)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const linkPattern = new RegExp(MARKDOWN_LINK_PATTERN.source, 'g')
    let match: RegExpExecArray | null = linkPattern.exec(line)

    while (match) {
      const linkTarget = match[2]

      if (
        !linkTarget.startsWith('http://') &&
        !linkTarget.startsWith('https://') &&
        !linkTarget.startsWith('#')
      ) {
        const targetPath = linkTarget.split('#')[0]
        const resolvedPath = resolve(fileDir, targetPath)

        if (!fileSystem.exists(resolvedPath)) {
          violations.push({
            file: filePath,
            message: `Broken link: "${linkTarget}"`,
            line: i + 1,
          })
        }
      }
      match = linkPattern.exec(line)
    }
  }

  return violations
}

/**
 * Validates the Open Questions section in idea files
 */
export function validateIdeaOpenQuestions(
  filePath: string,
  content: string
): Violation[] {
  const violations: Violation[] = []
  const lines = content.split('\n')

  let inOpenQuestions = false
  let currentQuestionLine: number | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // h2 heading: enters or exits the Open Questions section
    if (line.startsWith('## ')) {
      if (inOpenQuestions && currentQuestionLine !== null) {
        violations.push({
          file: filePath,
          message: 'Question has no options listed beneath it',
          line: currentQuestionLine,
        })
      }
      inOpenQuestions = line === '## Open Questions'
      currentQuestionLine = null
      continue
    }

    if (!inOpenQuestions) continue

    // h3 heading: a question (must end with ?)
    if (line.startsWith('### ')) {
      if (currentQuestionLine !== null) {
        violations.push({
          file: filePath,
          message: 'Question has no options listed beneath it',
          line: currentQuestionLine,
        })
      }

      if (!line.trimEnd().endsWith('?')) {
        violations.push({
          file: filePath,
          message:
            'Questions must end with "?" (e.g., "### Should we take our own payments?")',
          line: i + 1,
        })
        currentQuestionLine = null
      } else {
        currentQuestionLine = i + 1
      }
      continue
    }

    // h4 heading: an option (satisfies the current question)
    if (line.startsWith('#### ')) {
      currentQuestionLine = null
    }
  }

  // Handle question at end of file with no options
  if (inOpenQuestions && currentQuestionLine !== null) {
    violations.push({
      file: filePath,
      message: 'Question has no options listed beneath it',
      line: currentQuestionLine,
    })
  }

  return violations
}

/**
 * Validates that links in semantic sections (Goals, Blocked By) point to the correct artifact types
 */
export function validateSemanticLinks(
  filePath: string,
  content: string
): Violation[] {
  const violations: Violation[] = []
  const lines = content.split('\n')
  const fileDir = dirname(filePath)

  let currentSection: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check if this line is a heading
    if (line.startsWith('## ')) {
      currentSection = line
      continue
    }

    // Skip if not in a section we care about
    const rule = SEMANTIC_RULES.find(r => r.section === currentSection)
    if (!rule) continue

    // Find links on this line
    const linkPattern = new RegExp(MARKDOWN_LINK_PATTERN.source, 'g')
    let match: RegExpExecArray | null = linkPattern.exec(line)

    while (match) {
      const linkTarget = match[2]

      // Anchor links are not allowed in semantic sections
      if (linkTarget.startsWith('#')) {
        violations.push({
          file: filePath,
          message: `Link in "${rule.section}" must point to a ${rule.description} file, not an anchor: "${linkTarget}"`,
          line: i + 1,
        })
        match = linkPattern.exec(line)
        continue
      }

      // External links are not allowed in semantic sections
      if (
        linkTarget.startsWith('http://') ||
        linkTarget.startsWith('https://')
      ) {
        violations.push({
          file: filePath,
          message: `Link in "${rule.section}" must point to a ${rule.description} file, not an external URL: "${linkTarget}"`,
          line: i + 1,
        })
        match = linkPattern.exec(line)
        continue
      }

      const targetPath = linkTarget.split('#')[0]
      const resolvedPath = resolve(fileDir, targetPath)

      // Check if the resolved path contains the required path segment
      if (!resolvedPath.includes(rule.requiredPath)) {
        violations.push({
          file: filePath,
          message: `Link in "${rule.section}" must point to a ${rule.description} file: "${linkTarget}"`,
          line: i + 1,
        })
      }
      match = linkPattern.exec(line)
    }
  }

  return violations
}

/**
 * Validates that a goal file has the required hierarchy sections
 */
export function validateGoalHierarchySections(
  filePath: string,
  content: string
): Violation[] {
  const violations: Violation[] = []
  for (const heading of REQUIRED_GOAL_HEADINGS) {
    if (!content.includes(heading)) {
      violations.push({
        file: filePath,
        message: `Missing required heading: "${heading}"`,
      })
    }
  }
  return violations
}

/**
 * Validates that links in goal hierarchy sections point to goal files
 */
export function validateGoalHierarchyLinks(
  filePath: string,
  content: string
): Violation[] {
  const violations: Violation[] = []
  const lines = content.split('\n')
  const fileDir = dirname(filePath)

  let currentSection: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      currentSection = line
      continue
    }

    if (
      currentSection !== '## Parent Goal' &&
      currentSection !== '## Sub-Goals'
    ) {
      continue
    }

    const linkPattern = new RegExp(MARKDOWN_LINK_PATTERN.source, 'g')
    let match: RegExpExecArray | null = linkPattern.exec(line)

    while (match) {
      const linkTarget = match[2]

      if (linkTarget.startsWith('#')) {
        violations.push({
          file: filePath,
          message: `Link in "${currentSection}" must point to a goal file, not an anchor: "${linkTarget}"`,
          line: i + 1,
        })
        match = linkPattern.exec(line)
        continue
      }

      if (
        linkTarget.startsWith('http://') ||
        linkTarget.startsWith('https://')
      ) {
        violations.push({
          file: filePath,
          message: `Link in "${currentSection}" must point to a goal file, not an external URL: "${linkTarget}"`,
          line: i + 1,
        })
        match = linkPattern.exec(line)
        continue
      }

      const targetPath = linkTarget.split('#')[0]
      const resolvedPath = resolve(fileDir, targetPath)

      if (!resolvedPath.includes('/.dust/goals/')) {
        violations.push({
          file: filePath,
          message: `Link in "${currentSection}" must point to a goal file: "${linkTarget}"`,
          line: i + 1,
        })
      }
      match = linkPattern.exec(line)
    }
  }

  return violations
}

/**
 * Extracts the goal hierarchy relationships from a goal file
 */
export function extractGoalRelationships(
  filePath: string,
  content: string
): GoalRelationships {
  const lines = content.split('\n')
  const fileDir = dirname(filePath)
  const parentGoals: string[] = []
  const subGoals: string[] = []

  let currentSection: string | null = null

  for (const line of lines) {
    if (line.startsWith('## ')) {
      currentSection = line
      continue
    }

    if (
      currentSection !== '## Parent Goal' &&
      currentSection !== '## Sub-Goals'
    ) {
      continue
    }

    const linkPattern = new RegExp(MARKDOWN_LINK_PATTERN.source, 'g')
    let match: RegExpExecArray | null = linkPattern.exec(line)

    while (match) {
      const linkTarget = match[2]

      if (
        !linkTarget.startsWith('#') &&
        !linkTarget.startsWith('http://') &&
        !linkTarget.startsWith('https://')
      ) {
        const targetPath = linkTarget.split('#')[0]
        const resolvedPath = resolve(fileDir, targetPath)

        if (resolvedPath.includes('/.dust/goals/')) {
          if (currentSection === '## Parent Goal') {
            parentGoals.push(resolvedPath)
          } else {
            subGoals.push(resolvedPath)
          }
        }
      }
      match = linkPattern.exec(line)
    }
  }

  return { filePath, parentGoals, subGoals }
}

/**
 * Validates that goal hierarchy links are bidirectional
 */
export function validateBidirectionalLinks(
  allGoalRelationships: GoalRelationships[]
): Violation[] {
  const violations: Violation[] = []
  const relationshipMap = new Map<string, GoalRelationships>()

  for (const rel of allGoalRelationships) {
    relationshipMap.set(rel.filePath, rel)
  }

  for (const rel of allGoalRelationships) {
    // Check each parent goal to ensure it lists this goal as a sub-goal
    for (const parentPath of rel.parentGoals) {
      const parentRel = relationshipMap.get(parentPath)
      if (parentRel && !parentRel.subGoals.includes(rel.filePath)) {
        violations.push({
          file: rel.filePath,
          message: `Parent goal "${parentPath}" does not list this goal as a sub-goal`,
        })
      }
    }

    // Check each sub-goal to ensure it lists this goal as its parent
    for (const subGoalPath of rel.subGoals) {
      const subGoalRel = relationshipMap.get(subGoalPath)
      if (subGoalRel && !subGoalRel.parentGoals.includes(rel.filePath)) {
        violations.push({
          file: rel.filePath,
          message: `Sub-goal "${subGoalPath}" does not list this goal as its parent`,
        })
      }
    }
  }

  return violations
}

/**
 * Validates that there are no cycles in the goal hierarchy
 */
export function validateNoCycles(
  allGoalRelationships: GoalRelationships[]
): Violation[] {
  const violations: Violation[] = []
  const relationshipMap = new Map<string, GoalRelationships>()

  for (const rel of allGoalRelationships) {
    relationshipMap.set(rel.filePath, rel)
  }

  for (const rel of allGoalRelationships) {
    const visited = new Set<string>()
    const path: string[] = []
    let current: string | null = rel.filePath

    while (current) {
      if (visited.has(current)) {
        const cycleStart = path.indexOf(current)
        const cyclePath = path.slice(cycleStart).concat(current)
        violations.push({
          file: rel.filePath,
          message: `Cycle detected in goal hierarchy: ${cyclePath.join(' -> ')}`,
        })
        break
      }

      visited.add(current)
      path.push(current)

      const currentRel = relationshipMap.get(current)
      if (currentRel && currentRel.parentGoals.length > 0) {
        current = currentRel.parentGoals[0]
      } else {
        current = null
      }
    }
  }

  return violations
}

// ============================================================================
// High-level Validation
// ============================================================================

/**
 * Options for running the lintMarkdown function
 */
export interface LintMarkdownOptions {
  cwd: string
  fileSystem: FileSystem
  globScanner: GlobScanner
  stdout?: (message: string) => void
  stderr?: (message: string) => void
}

/**
 * Result of running lintMarkdown
 */
export interface LintMarkdownResult {
  exitCode: number
  violations: Violation[]
}

/**
 * Runs all markdown validation checks on the .dust directory
 */
export async function lintMarkdown(
  options: LintMarkdownOptions
): Promise<LintMarkdownResult> {
  const {
    cwd,
    fileSystem,
    globScanner: glob,
    stdout = () => {},
    stderr = () => {},
  } = options
  const dustPath = `${cwd}/.dust`

  if (!fileSystem.exists(dustPath)) {
    stderr('Error: .dust directory not found')
    stderr("Run 'dust init' to initialize a Dust repository")
    return { exitCode: 1, violations: [] }
  }

  const violations: Violation[] = []

  // Validate all markdown files for links
  stdout('Validating links in .dust/...')

  for await (const file of glob.scan(dustPath)) {
    if (!file.endsWith('.md')) continue

    const filePath = `${dustPath}/${file}`
    const content = await fileSystem.readFile(filePath)
    violations.push(...validateLinks(filePath, content, fileSystem))
  }

  // Validate opening sentences and title-filename matching in all content directories
  const contentDirs = ['goals', 'facts', 'ideas', 'tasks']
  stdout('Validating content files...')

  for (const dir of contentDirs) {
    const dirPath = `${dustPath}/${dir}`
    if (!fileSystem.exists(dirPath)) continue

    for await (const file of glob.scan(dirPath)) {
      if (!file.endsWith('.md')) continue

      const filePath = `${dirPath}/${file}`
      const content = await fileSystem.readFile(filePath)

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

  // Validate task files specifically
  const tasksPath = `${dustPath}/tasks`
  if (fileSystem.exists(tasksPath)) {
    stdout('Validating task files in .dust/tasks/...')

    for await (const file of glob.scan(tasksPath)) {
      if (!file.endsWith('.md')) continue

      const filePath = `${tasksPath}/${file}`
      const content = await fileSystem.readFile(filePath)

      const filenameViolation = validateFilename(filePath)
      if (filenameViolation) {
        violations.push(filenameViolation)
      }

      violations.push(...validateTaskHeadings(filePath, content))
      violations.push(...validateSemanticLinks(filePath, content))
    }
  }

  // Validate idea files specifically
  const ideasPath = `${dustPath}/ideas`
  if (fileSystem.exists(ideasPath)) {
    stdout('Validating idea files in .dust/ideas/...')

    for await (const file of glob.scan(ideasPath)) {
      if (!file.endsWith('.md')) continue

      const filePath = `${ideasPath}/${file}`
      const content = await fileSystem.readFile(filePath)

      violations.push(...validateIdeaOpenQuestions(filePath, content))
    }
  }

  // Validate goal files hierarchy
  const goalsPath = `${dustPath}/goals`
  if (fileSystem.exists(goalsPath)) {
    stdout('Validating goal hierarchy in .dust/goals/...')

    const allGoalRelationships: GoalRelationships[] = []

    for await (const file of glob.scan(goalsPath)) {
      if (!file.endsWith('.md')) continue

      const filePath = `${goalsPath}/${file}`
      const content = await fileSystem.readFile(filePath)

      violations.push(...validateGoalHierarchySections(filePath, content))
      violations.push(...validateGoalHierarchyLinks(filePath, content))

      allGoalRelationships.push(extractGoalRelationships(filePath, content))
    }

    violations.push(...validateBidirectionalLinks(allGoalRelationships))
    violations.push(...validateNoCycles(allGoalRelationships))
  }

  if (violations.length === 0) {
    stdout('All validations passed!')
    return { exitCode: 0, violations: [] }
  }

  stderr(`Found ${violations.length} violation(s):`)
  stderr('')

  for (const v of violations) {
    const location = v.line ? `:${v.line}` : ''
    stderr(`  ${v.file}${location}`)
    stderr(`    ${v.message}`)
  }

  return { exitCode: 1, violations }
}

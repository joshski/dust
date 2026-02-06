/**
 * dust lint markdown - Run lint checks on .dust/ markdown files
 */

import { dirname, resolve } from 'node:path'
import {
  extractOpeningSentence,
  extractTitle,
  MARKDOWN_LINK_PATTERN,
} from '../../markdown/markdown-utilities'
import type {
  CommandDependencies,
  CommandResult,
  FileSystem,
  GlobScanner,
} from '../types'

// Re-export for backwards compatibility
export type { GlobScanner }

const REQUIRED_HEADINGS = ['## Goals', '## Blocked By', '## Definition of Done']
const REQUIRED_GOAL_HEADINGS = ['## Parent Goal', '## Sub-Goals']

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*\.md$/

const MAX_OPENING_SENTENCE_LENGTH = 150

export const IDEA_TRANSITION_PREFIXES = [
  'Refine Idea: ',
  'Create Task From Idea: ',
  'Shelve Idea: ',
]

export interface Violation {
  file: string
  message: string
  line?: number
}

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

export function validateIdeaTransitionTitle(
  filePath: string,
  content: string,
  ideasPath: string,
  fileSystem: FileSystem
): Violation | null {
  const title = extractTitle(content)
  if (!title) {
    return null
  }

  for (const prefix of IDEA_TRANSITION_PREFIXES) {
    if (title.startsWith(prefix)) {
      const ideaTitle = title.slice(prefix.length)
      const ideaFilename = titleToFilename(ideaTitle)
      if (!fileSystem.exists(`${ideasPath}/${ideaFilename}`)) {
        return {
          file: filePath,
          message: `Idea transition task references non-existent idea: "${ideaTitle}" (expected file "${ideaFilename}" in ideas/)`,
        }
      }
      return null
    }
  }

  return null
}

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

export interface GoalRelationships {
  filePath: string
  parentGoals: string[]
  subGoals: string[]
}

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

      const ideaTransitionViolation = validateIdeaTransitionTitle(
        filePath,
        content,
        ideasPath,
        fileSystem
      )
      if (ideaTransitionViolation) {
        violations.push(ideaTransitionViolation)
      }
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

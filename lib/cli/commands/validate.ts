/**
 * dust validate - Run validation checks on Dust repository
 */

import { dirname, resolve } from 'node:path'
import type {
  CommandDependencies,
  CommandResult,
  FileSystem,
  GlobScanner,
} from '../types'

// Re-export for backwards compatibility
export type { GlobScanner }

const REQUIRED_HEADINGS = ['## Goals', '## Blocked by', '## Definition of done']

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*\.md$/

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
  fs: FileSystem
): Violation[] {
  const violations: Violation[] = []
  const lines = content.split('\n')
  const fileDir = dirname(filePath)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g
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

        if (!fs.exists(resolvedPath)) {
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
    section: '## Blocked by',
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
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g
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

export async function validate(
  deps: CommandDependencies
): Promise<CommandResult> {
  const { context: ctx, fileSystem: fs, globScanner: glob } = deps
  const dustPath = `${ctx.cwd}/.dust`

  if (!fs.exists(dustPath)) {
    ctx.stderr('Error: .dust directory not found')
    ctx.stderr("Run 'dust init' to initialize a Dust repository")
    return { exitCode: 1 }
  }

  const violations: Violation[] = []

  // Validate all markdown files for links
  ctx.stdout('Validating links in .dust/...')

  for await (const file of glob.scan(dustPath)) {
    if (!file.endsWith('.md')) continue

    const filePath = `${dustPath}/${file}`
    const content = await fs.readFile(filePath)
    violations.push(...validateLinks(filePath, content, fs))
  }

  // Validate task files specifically
  const tasksPath = `${dustPath}/tasks`
  if (fs.exists(tasksPath)) {
    ctx.stdout('Validating task files in .dust/tasks/...')

    for await (const file of glob.scan(tasksPath)) {
      if (!file.endsWith('.md')) continue

      const filePath = `${tasksPath}/${file}`
      const content = await fs.readFile(filePath)

      const filenameViolation = validateFilename(filePath)
      if (filenameViolation) {
        violations.push(filenameViolation)
      }

      violations.push(...validateTaskHeadings(filePath, content))
      violations.push(...validateSemanticLinks(filePath, content))
    }
  }

  if (violations.length === 0) {
    ctx.stdout('All validations passed!')
    return { exitCode: 0 }
  }

  ctx.stderr(`Found ${violations.length} violation(s):`)
  ctx.stderr('')

  for (const v of violations) {
    const location = v.line ? `:${v.line}` : ''
    ctx.stderr(`  ${v.file}${location}`)
    ctx.stderr(`    ${v.message}`)
  }

  return { exitCode: 1 }
}

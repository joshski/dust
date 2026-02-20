/**
 * Link validation for .dust markdown files
 */

import { dirname, resolve } from 'node:path'
import type { ReadableFileSystem } from '../../filesystem/types'
import { MARKDOWN_LINK_PATTERN } from '../../markdown/markdown-utilities'
import type { Violation } from './types'

interface SemanticRule {
  section: string
  requiredPath: string
  description: string
}

const SEMANTIC_RULES: SemanticRule[] = [
  {
    section: '## Principles',
    requiredPath: '/.dust/principles/',
    description: 'principle',
  },
  {
    section: '## Blocked By',
    requiredPath: '/.dust/tasks/',
    description: 'task',
  },
]

export function validateLinks(
  filePath: string,
  content: string,
  fileSystem: ReadableFileSystem
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

export function validatePrincipleHierarchyLinks(
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
      currentSection !== '## Parent Principle' &&
      currentSection !== '## Sub-Principles'
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
          message: `Link in "${currentSection}" must point to a principle file, not an anchor: "${linkTarget}"`,
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
          message: `Link in "${currentSection}" must point to a principle file, not an external URL: "${linkTarget}"`,
          line: i + 1,
        })
        match = linkPattern.exec(line)
        continue
      }

      const targetPath = linkTarget.split('#')[0]
      const resolvedPath = resolve(fileDir, targetPath)

      if (!resolvedPath.includes('/.dust/principles/')) {
        violations.push({
          file: filePath,
          message: `Link in "${currentSection}" must point to a principle file: "${linkTarget}"`,
          line: i + 1,
        })
      }
      match = linkPattern.exec(line)
    }
  }

  return violations
}

/**
 * Link validation for .dust markdown files
 */

import { dirname, resolve } from 'node:path'
import type {
  ParsedArtifact,
  ParsedMarkdownLink,
} from '../../artifacts/parsed-artifact'
import type { ReadableFileSystem } from '../../filesystem/types'
import type { Violation } from './types'

interface SemanticRule {
  sectionHeading: string
  requiredPath: string
  description: string
}

const SEMANTIC_RULES: SemanticRule[] = [
  {
    sectionHeading: 'Principles',
    requiredPath: '/.dust/principles/',
    description: 'principle',
  },
  {
    sectionHeading: 'Blocked By',
    requiredPath: '/.dust/tasks/',
    description: 'task',
  },
]

function isExternalOrAnchorLink(target: string): boolean {
  return (
    target.startsWith('http://') ||
    target.startsWith('https://') ||
    target.startsWith('#')
  )
}

function isAnchorLink(target: string): boolean {
  return target.startsWith('#')
}

function isExternalLink(target: string): boolean {
  return target.startsWith('http://') || target.startsWith('https://')
}

export function validateLinks(
  artifact: ParsedArtifact,
  fileSystem: ReadableFileSystem
): Violation[] {
  const violations: Violation[] = []
  const fileDir = dirname(artifact.filePath)

  for (const link of artifact.allLinks) {
    if (isExternalOrAnchorLink(link.target)) {
      continue
    }

    if (link.target.startsWith('/')) {
      violations.push({
        file: artifact.filePath,
        message: `Absolute link not allowed: "${link.target}" (use a relative path instead)`,
        line: link.line,
      })
      continue
    }

    const targetPath = link.target.split('#')[0]
    const resolvedPath = resolve(fileDir, targetPath)

    if (!fileSystem.exists(resolvedPath)) {
      violations.push({
        file: artifact.filePath,
        message: `Broken link: "${link.target}"`,
        line: link.line,
      })
    }
  }

  return violations
}

function validateSectionLink(
  artifact: ParsedArtifact,
  link: ParsedMarkdownLink,
  rule: SemanticRule
): Violation | null {
  const sectionLabel = `## ${rule.sectionHeading}`

  if (isAnchorLink(link.target)) {
    return {
      file: artifact.filePath,
      message: `Link in "${sectionLabel}" must point to a ${rule.description} file, not an anchor: "${link.target}"`,
      line: link.line,
    }
  }

  if (isExternalLink(link.target)) {
    return {
      file: artifact.filePath,
      message: `Link in "${sectionLabel}" must point to a ${rule.description} file, not an external URL: "${link.target}"`,
      line: link.line,
    }
  }

  const fileDir = dirname(artifact.filePath)
  const targetPath = link.target.split('#')[0]
  const resolvedPath = resolve(fileDir, targetPath)

  if (!resolvedPath.includes(rule.requiredPath)) {
    return {
      file: artifact.filePath,
      message: `Link in "${sectionLabel}" must point to a ${rule.description} file: "${link.target}"`,
      line: link.line,
    }
  }

  return null
}

export function validateSemanticLinks(artifact: ParsedArtifact): Violation[] {
  const violations: Violation[] = []

  for (const section of artifact.sections) {
    const rule = SEMANTIC_RULES.find(r => r.sectionHeading === section.heading)
    if (!rule) continue

    for (const link of section.links) {
      const violation = validateSectionLink(artifact, link, rule)
      if (violation) {
        violations.push(violation)
      }
    }
  }

  return violations
}

export function validatePrincipleHierarchyLinks(
  artifact: ParsedArtifact
): Violation[] {
  const violations: Violation[] = []
  const hierarchySections = ['Parent Principle', 'Sub-Principles']

  for (const section of artifact.sections) {
    if (!hierarchySections.includes(section.heading)) continue

    const sectionLabel = `## ${section.heading}`
    const fileDir = dirname(artifact.filePath)

    for (const link of section.links) {
      if (isAnchorLink(link.target)) {
        violations.push({
          file: artifact.filePath,
          message: `Link in "${sectionLabel}" must point to a principle file, not an anchor: "${link.target}"`,
          line: link.line,
        })
        continue
      }

      if (isExternalLink(link.target)) {
        violations.push({
          file: artifact.filePath,
          message: `Link in "${sectionLabel}" must point to a principle file, not an external URL: "${link.target}"`,
          line: link.line,
        })
        continue
      }

      const targetPath = link.target.split('#')[0]
      const resolvedPath = resolve(fileDir, targetPath)

      if (!resolvedPath.includes('/.dust/principles/')) {
        violations.push({
          file: artifact.filePath,
          message: `Link in "${sectionLabel}" must point to a principle file: "${link.target}"`,
          line: link.line,
        })
      }
    }
  }

  return violations
}

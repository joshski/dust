/**
 * Principle hierarchy validation for .dust markdown files
 */

import { dirname, resolve } from 'node:path'
import { MARKDOWN_LINK_PATTERN } from '../../markdown/markdown-utilities'
import type { PrincipleRelationships, Violation } from './types'

export type { PrincipleRelationships }

const REQUIRED_PRINCIPLE_HEADINGS = ['## Parent Principle', '## Sub-Principles']

export function validatePrincipleHierarchySections(
  filePath: string,
  content: string
): Violation[] {
  const violations: Violation[] = []
  for (const heading of REQUIRED_PRINCIPLE_HEADINGS) {
    if (!content.includes(heading)) {
      violations.push({
        file: filePath,
        message: `Missing required heading: "${heading}"`,
      })
    }
  }
  return violations
}

export function extractPrincipleRelationships(
  filePath: string,
  content: string
): PrincipleRelationships {
  const lines = content.split('\n')
  const fileDir = dirname(filePath)
  const parentPrinciples: string[] = []
  const subPrinciples: string[] = []

  let currentSection: string | null = null

  for (const line of lines) {
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

      const isLocalLink =
        !linkTarget.startsWith('#') &&
        !linkTarget.startsWith('http://') &&
        !linkTarget.startsWith('https://')

      if (!isLocalLink) {
        match = linkPattern.exec(line)
        continue
      }

      const targetPath = linkTarget.split('#')[0]
      const resolvedPath = resolve(fileDir, targetPath)

      if (!resolvedPath.includes('/.dust/principles/')) {
        match = linkPattern.exec(line)
        continue
      }

      if (currentSection === '## Parent Principle') {
        parentPrinciples.push(resolvedPath)
      } else {
        subPrinciples.push(resolvedPath)
      }
      match = linkPattern.exec(line)
    }
  }

  return { filePath, parentPrinciples, subPrinciples }
}

export function validateBidirectionalLinks(
  allPrincipleRelationships: PrincipleRelationships[]
): Violation[] {
  const violations: Violation[] = []
  const relationshipMap = new Map<string, PrincipleRelationships>()

  for (const rel of allPrincipleRelationships) {
    relationshipMap.set(rel.filePath, rel)
  }

  for (const rel of allPrincipleRelationships) {
    // Check each parent principle to ensure it lists this principle as a sub-principle
    for (const parentPath of rel.parentPrinciples) {
      const parentRel = relationshipMap.get(parentPath)
      if (parentRel && !parentRel.subPrinciples.includes(rel.filePath)) {
        violations.push({
          file: rel.filePath,
          message: `Parent principle "${parentPath}" does not list this principle as a sub-principle`,
        })
      }
    }

    // Check each sub-principle to ensure it lists this principle as its parent
    for (const subPrinciplePath of rel.subPrinciples) {
      const subPrincipleRel = relationshipMap.get(subPrinciplePath)
      if (
        subPrincipleRel &&
        !subPrincipleRel.parentPrinciples.includes(rel.filePath)
      ) {
        violations.push({
          file: rel.filePath,
          message: `Sub-principle "${subPrinciplePath}" does not list this principle as its parent`,
        })
      }
    }
  }

  return violations
}

export function validateNoCycles(
  allPrincipleRelationships: PrincipleRelationships[]
): Violation[] {
  const violations: Violation[] = []
  const relationshipMap = new Map<string, PrincipleRelationships>()

  for (const rel of allPrincipleRelationships) {
    relationshipMap.set(rel.filePath, rel)
  }

  for (const rel of allPrincipleRelationships) {
    const visited = new Set<string>()
    const path: string[] = []
    let current: string | null = rel.filePath

    while (current) {
      if (visited.has(current)) {
        const cycleStart = path.indexOf(current)
        const cyclePath = path.slice(cycleStart).concat(current)
        violations.push({
          file: rel.filePath,
          message: `Cycle detected in principle hierarchy: ${cyclePath.join(' -> ')}`,
        })
        break
      }

      visited.add(current)
      path.push(current)

      const currentRel = relationshipMap.get(current)
      if (currentRel && currentRel.parentPrinciples.length > 0) {
        current = currentRel.parentPrinciples[0]
      } else {
        current = null
      }
    }
  }

  return violations
}

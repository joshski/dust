/**
 * Principle hierarchy validation for .dust markdown files
 */

import { dirname, resolve } from 'node:path'
import type { ParsedArtifact } from '../../artifacts/parsed-artifact'
import type { PrincipleRelationships, Violation } from './types'

const REQUIRED_PRINCIPLE_HEADINGS = ['Parent Principle', 'Sub-Principles']

export function validatePrincipleHierarchySections(
  artifact: ParsedArtifact
): Violation[] {
  const violations: Violation[] = []
  const sectionHeadings = new Set(artifact.sections.map(s => s.heading))

  for (const heading of REQUIRED_PRINCIPLE_HEADINGS) {
    if (!sectionHeadings.has(heading)) {
      violations.push({
        file: artifact.filePath,
        message: `Missing required heading: "## ${heading}"`,
      })
    }
  }
  return violations
}

function isLocalPrincipleLink(target: string, resolvedPath: string): boolean {
  const isLocalLink =
    !target.startsWith('#') &&
    !target.startsWith('http://') &&
    !target.startsWith('https://')

  return isLocalLink && resolvedPath.includes('/.dust/principles/')
}

export function extractPrincipleRelationships(
  artifact: ParsedArtifact
): PrincipleRelationships {
  const fileDir = dirname(artifact.filePath)
  const parentPrinciples: string[] = []
  const subPrinciples: string[] = []

  for (const section of artifact.sections) {
    if (
      section.heading !== 'Parent Principle' &&
      section.heading !== 'Sub-Principles'
    ) {
      continue
    }

    for (const link of section.links) {
      const targetPath = link.target.split('#')[0]
      const resolvedPath = resolve(fileDir, targetPath)

      if (!isLocalPrincipleLink(link.target, resolvedPath)) {
        continue
      }

      if (section.heading === 'Parent Principle') {
        parentPrinciples.push(resolvedPath)
      } else {
        subPrinciples.push(resolvedPath)
      }
    }
  }

  return { filePath: artifact.filePath, parentPrinciples, subPrinciples }
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

/**
 * Goal hierarchy validation for .dust markdown files
 */

import { dirname, resolve } from 'node:path'
import { MARKDOWN_LINK_PATTERN } from '../../markdown/markdown-utilities'
import type { GoalRelationships, Violation } from './types'

export type { GoalRelationships }

const REQUIRED_GOAL_HEADINGS = ['## Parent Goal', '## Sub-Goals']

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

/**
 * Shared types for lint validators
 */

export interface Violation {
  file: string
  message: string
  line?: number
}

export interface GoalRelationships {
  filePath: string
  parentGoals: string[]
  subGoals: string[]
}

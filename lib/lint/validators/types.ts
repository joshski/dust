/**
 * Shared types for lint validators
 */

export interface Violation {
  file: string
  message: string
  line?: number
}

export interface PrincipleRelationships {
  filePath: string
  parentPrinciples: string[]
  subPrinciples: string[]
}

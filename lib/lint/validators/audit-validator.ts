/**
 * Audit file validation for .dust/config/audits/ markdown files.
 *
 * Custom audits must follow the same structure as stock audits:
 * - Opening description after H1 title
 * - ## Scope section
 * - ## Blocked By section
 * - ## Definition of Done section
 */

import type { ParsedArtifact } from '../../artifacts/parsed-artifact'
import type { Violation } from './types'

const REQUIRED_AUDIT_HEADINGS = ['Scope', 'Blocked By', 'Definition of Done']

/**
 * Validates that an audit file contains all required section headings.
 */
export function validateAuditHeadings(artifact: ParsedArtifact): Violation[] {
  const violations: Violation[] = []
  const sectionHeadings = new Set(artifact.sections.map(s => s.heading))

  for (const heading of REQUIRED_AUDIT_HEADINGS) {
    if (!sectionHeadings.has(heading)) {
      violations.push({
        file: artifact.filePath,
        message: `Missing required heading: "## ${heading}"`,
      })
    }
  }
  return violations
}

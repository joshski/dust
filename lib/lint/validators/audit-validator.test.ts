import { describe, expect, test } from 'vitest'
import { parseArtifact } from '../../artifacts/parsed-artifact'
import { validateAuditHeadings } from './audit-validator'

describe('audit-validator', () => {
  describe('validateAuditHeadings', () => {
    test('returns no violations for valid audit with all required sections', () => {
      const content = `# My Audit

Check something important.

## Scope

Files to check.

## Blocked By

(none)

## Definition of Done

- All checks pass
`
      const artifact = parseArtifact('/test/audit.md', content)
      const violations = validateAuditHeadings(artifact)
      expect(violations).toEqual([])
    })

    test('returns violation for missing Scope section', () => {
      const content = `# My Audit

Check something.

## Blocked By

(none)

## Definition of Done

- Done
`
      const artifact = parseArtifact('/test/audit.md', content)
      const violations = validateAuditHeadings(artifact)
      expect(violations).toHaveLength(1)
      expect(violations[0].message).toBe('Missing required heading: "## Scope"')
    })

    test('returns violation for missing Blocked By section', () => {
      const content = `# My Audit

Check something.

## Scope

Files to check.

## Definition of Done

- Done
`
      const artifact = parseArtifact('/test/audit.md', content)
      const violations = validateAuditHeadings(artifact)
      expect(violations).toHaveLength(1)
      expect(violations[0].message).toBe(
        'Missing required heading: "## Blocked By"'
      )
    })

    test('returns violation for missing Definition of Done section', () => {
      const content = `# My Audit

Check something.

## Scope

Files to check.

## Blocked By

(none)
`
      const artifact = parseArtifact('/test/audit.md', content)
      const violations = validateAuditHeadings(artifact)
      expect(violations).toHaveLength(1)
      expect(violations[0].message).toBe(
        'Missing required heading: "## Definition of Done"'
      )
    })

    test('returns multiple violations for multiple missing sections', () => {
      const content = `# My Audit

Check something.

## Random Section

Some content.
`
      const artifact = parseArtifact('/test/audit.md', content)
      const violations = validateAuditHeadings(artifact)
      expect(violations).toHaveLength(3)
      expect(violations.map(v => v.message)).toContain(
        'Missing required heading: "## Scope"'
      )
      expect(violations.map(v => v.message)).toContain(
        'Missing required heading: "## Blocked By"'
      )
      expect(violations.map(v => v.message)).toContain(
        'Missing required heading: "## Definition of Done"'
      )
    })

    test('includes file path in violation', () => {
      const content = `# My Audit

Check something.
`
      const artifact = parseArtifact('/path/to/custom-audit.md', content)
      const violations = validateAuditHeadings(artifact)
      expect(violations.length).toBeGreaterThan(0)
      expect(violations[0].file).toBe('/path/to/custom-audit.md')
    })
  })
})

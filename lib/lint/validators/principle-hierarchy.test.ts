import { describe, expect, test } from 'vitest'
import { parseArtifact } from '../../artifacts/parsed-artifact'
import {
  extractPrincipleRelationships,
  validateBidirectionalLinks,
  validateNoCycles,
  validatePrincipleHierarchySections,
} from './principle-hierarchy'

describe('principle-hierarchy', () => {
  describe('validatePrincipleHierarchySections', () => {
    test('returns violations for missing required headings', () => {
      const content = `# A Principle

Some description.
`
      const artifact = parseArtifact(
        '/project/.dust/principles/test.md',
        content
      )
      const violations = validatePrincipleHierarchySections(artifact)
      expect(violations).toHaveLength(2)
      expect(violations.map(v => v.message)).toContain(
        'Missing required heading: "## Parent Principle"'
      )
      expect(violations.map(v => v.message)).toContain(
        'Missing required heading: "## Sub-Principles"'
      )
    })

    test('returns no violations when all required headings present', () => {
      const content = `# A Principle

Some description.

## Parent Principle

(none)

## Sub-Principles

(none)
`
      const artifact = parseArtifact(
        '/project/.dust/principles/test.md',
        content
      )
      const violations = validatePrincipleHierarchySections(artifact)
      expect(violations).toHaveLength(0)
    })
  })

  describe('extractPrincipleRelationships', () => {
    test('extracts parent and sub-principle links', () => {
      const content = `# Child Principle

Some description.

## Parent Principle

- [Parent](./parent.md)

## Sub-Principles

- [Sub1](./sub1.md)
- [Sub2](./sub2.md)
`
      const artifact = parseArtifact(
        '/project/.dust/principles/child.md',
        content
      )
      const relationships = extractPrincipleRelationships(artifact)
      expect(relationships.filePath).toBe('/project/.dust/principles/child.md')
      expect(relationships.parentPrinciples).toHaveLength(1)
      expect(relationships.parentPrinciples[0]).toContain('parent.md')
      expect(relationships.subPrinciples).toHaveLength(2)
    })

    test('ignores links in unrelated sections', () => {
      const content = `# A Principle

Some description.

## Context

- [Some Link](./other.md)

## Parent Principle

(none)

## Sub-Principles

(none)
`
      const artifact = parseArtifact(
        '/project/.dust/principles/test.md',
        content
      )
      const relationships = extractPrincipleRelationships(artifact)
      expect(relationships.parentPrinciples).toHaveLength(0)
      expect(relationships.subPrinciples).toHaveLength(0)
    })

    test('ignores external and anchor links', () => {
      const content = `# A Principle

## Parent Principle

- [External](https://example.com)
- [Anchor](#section)

## Sub-Principles

(none)
`
      const artifact = parseArtifact(
        '/project/.dust/principles/test.md',
        content
      )
      const relationships = extractPrincipleRelationships(artifact)
      expect(relationships.parentPrinciples).toHaveLength(0)
    })
  })

  describe('validateBidirectionalLinks', () => {
    test('detects when parent does not list child as sub-principle', () => {
      const parentContent = `# Parent

## Parent Principle

(none)

## Sub-Principles

(none)
`
      const childContent = `# Child

## Parent Principle

- [Parent](./parent.md)

## Sub-Principles

(none)
`
      const parentArtifact = parseArtifact(
        '/project/.dust/principles/parent.md',
        parentContent
      )
      const childArtifact = parseArtifact(
        '/project/.dust/principles/child.md',
        childContent
      )

      const allRelationships = [
        extractPrincipleRelationships(parentArtifact),
        extractPrincipleRelationships(childArtifact),
      ]

      const violations = validateBidirectionalLinks(allRelationships)
      expect(violations).toHaveLength(1)
      expect(violations[0].message).toContain(
        'does not list this principle as a sub-principle'
      )
    })
  })

  describe('validateNoCycles', () => {
    test('detects cycles in hierarchy', () => {
      const aContent = `# A

## Parent Principle

- [B](./b.md)

## Sub-Principles

(none)
`
      const bContent = `# B

## Parent Principle

- [A](./a.md)

## Sub-Principles

(none)
`
      const aArtifact = parseArtifact(
        '/project/.dust/principles/a.md',
        aContent
      )
      const bArtifact = parseArtifact(
        '/project/.dust/principles/b.md',
        bContent
      )

      const allRelationships = [
        extractPrincipleRelationships(aArtifact),
        extractPrincipleRelationships(bArtifact),
      ]

      const violations = validateNoCycles(allRelationships)
      expect(violations.length).toBeGreaterThan(0)
      expect(violations[0].message).toContain('Cycle detected')
    })
  })
})

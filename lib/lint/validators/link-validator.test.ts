import { describe, expect, test } from 'vitest'
import { parseArtifact } from '../../artifacts/parsed-artifact'
import type { ReadableFileSystem } from '../../filesystem/types'
import {
  validateLinks,
  validatePrincipleHierarchyLinks,
  validateSemanticLinks,
} from './link-validator'

function createMockFileSystem(
  existsFn: (path: string) => boolean
): ReadableFileSystem {
  return {
    exists: existsFn,
    readFile: async () => '',
    readdir: async () => [],
    isDirectory: () => false,
  }
}

describe('link-validator', () => {
  describe('validateLinks', () => {
    test('skips external and anchor links', () => {
      const content = `# Test

[External](https://example.com)
[Anchor](#section)
`
      const artifact = parseArtifact('/test.md', content)
      const fileSystem = createMockFileSystem(() => true)

      const violations = validateLinks(artifact, fileSystem)
      expect(violations).toHaveLength(0)
    })

    test('reports absolute link violation', () => {
      const content = `# Test

[Absolute](/path/to/file.md)
`
      const artifact = parseArtifact('/test.md', content)
      const fileSystem = createMockFileSystem(() => true)

      const violations = validateLinks(artifact, fileSystem)
      expect(violations).toHaveLength(1)
      expect(violations[0].message).toContain('Absolute link not allowed')
    })

    test('reports broken link', () => {
      const content = `# Test

[Broken](./missing.md)
`
      const artifact = parseArtifact('/test.md', content)
      const fileSystem = createMockFileSystem(() => false)

      const violations = validateLinks(artifact, fileSystem)
      expect(violations).toHaveLength(1)
      expect(violations[0].message).toContain('Broken link')
    })
  })

  describe('validateSemanticLinks', () => {
    test('validates links in Principles section', () => {
      const content = `# Task

## Principles

- [Not a principle](./some-file.md)
`
      const artifact = parseArtifact('/project/.dust/tasks/task.md', content)

      const violations = validateSemanticLinks(artifact)
      expect(violations).toHaveLength(1)
      expect(violations[0].message).toContain('must point to a principle file')
    })

    test('skips non-semantic sections', () => {
      const content = `# Task

## Context

- [Some Link](./other.md)
`
      const artifact = parseArtifact('/project/.dust/tasks/task.md', content)

      const violations = validateSemanticLinks(artifact)
      expect(violations).toHaveLength(0)
    })
  })

  describe('validatePrincipleHierarchyLinks', () => {
    test('validates links in Parent Principle section', () => {
      const content = `# Principle

## Parent Principle

- [Not in principles](../tasks/some-task.md)
`
      const artifact = parseArtifact(
        '/project/.dust/principles/test.md',
        content
      )

      const violations = validatePrincipleHierarchyLinks(artifact)
      expect(violations).toHaveLength(1)
      expect(violations[0].message).toContain('must point to a principle file')
    })

    test('skips non-hierarchy sections', () => {
      const content = `# Principle

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

      const violations = validatePrincipleHierarchyLinks(artifact)
      expect(violations).toHaveLength(0)
    })

    test('reports anchor links in hierarchy sections', () => {
      const content = `# Principle

## Parent Principle

- [Anchor](#section)

## Sub-Principles

(none)
`
      const artifact = parseArtifact(
        '/project/.dust/principles/test.md',
        content
      )

      const violations = validatePrincipleHierarchyLinks(artifact)
      expect(violations).toHaveLength(1)
      expect(violations[0].message).toContain('not an anchor')
    })

    test('reports external links in hierarchy sections', () => {
      const content = `# Principle

## Parent Principle

- [External](https://example.com)

## Sub-Principles

(none)
`
      const artifact = parseArtifact(
        '/project/.dust/principles/test.md',
        content
      )

      const violations = validatePrincipleHierarchyLinks(artifact)
      expect(violations).toHaveLength(1)
      expect(violations[0].message).toContain('not an external URL')
    })
  })
})

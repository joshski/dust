import { describe, expect, test } from 'vitest'
import type { Principle } from './principles'
import {
  isInternalPrinciple,
  listCorePrinciples,
  getCorePrincipleTree,
} from './core-principles'

/**
 * Creates a simple Principle for testing listCorePrinciples.
 */
function makeSimplePrinciple(
  slug: string,
  internal: boolean = false
): Principle {
  return {
    slug,
    title: slug.replace(/-/g, ' '),
    content: internal
      ? `# ${slug}\n\n## Applicability\n\nInternal\n`
      : `# ${slug}\n\nDescription.\n`,
    parentPrinciple: null,
    subPrinciples: [],
  }
}

/**
 * Creates a Principle with hierarchy options for testing getCorePrincipleTree.
 */
function makePrincipleWithHierarchy(
  slug: string,
  options: {
    internal?: boolean
    parentPrinciple?: string | null
    subPrinciples?: string[]
  } = {}
): Principle {
  return {
    slug,
    title: slug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    content: options.internal
      ? `# ${slug}\n\n## Applicability\n\nInternal\n`
      : `# ${slug}\n\nDescription.\n`,
    parentPrinciple: options.parentPrinciple ?? null,
    subPrinciples: options.subPrinciples ?? [],
  }
}

describe('isInternalPrinciple', () => {
  test('returns true when Applicability section contains Internal', () => {
    const content = `# My Principle

Description here.

## Applicability

Internal

## Parent Principle

- [Parent](parent.md)
`
    expect(isInternalPrinciple(content)).toBe(true)
  })

  test('returns false when no Applicability section exists', () => {
    const content = `# My Principle

Description here.

## Parent Principle

- [Parent](parent.md)
`
    expect(isInternalPrinciple(content)).toBe(false)
  })

  test('returns false when Applicability section does not contain Internal', () => {
    const content = `# My Principle

Description here.

## Applicability

Public

## Parent Principle

- [Parent](parent.md)
`
    expect(isInternalPrinciple(content)).toBe(false)
  })

  test('returns false for empty Applicability section', () => {
    const content = `# My Principle

## Applicability

## Parent Principle

- [Parent](parent.md)
`
    expect(isInternalPrinciple(content)).toBe(false)
  })

  test('returns true when Internal appears on its own line in Applicability', () => {
    const content = `# My Principle

## Applicability

  Internal

## Sub-Principles
`
    expect(isInternalPrinciple(content)).toBe(true)
  })

  test('ignores Internal in other sections', () => {
    const content = `# My Principle

This principle is for Internal use only.

## Sub-Principles

- [Internal Principle](internal.md)
`
    expect(isInternalPrinciple(content)).toBe(false)
  })

  test('stops at h1 heading within Applicability section', () => {
    const content = `# My Principle

## Applicability

# Another Document

Internal
`
    expect(isInternalPrinciple(content)).toBe(false)
  })
})

describe('listCorePrinciples', () => {
  test('returns all slugs when no principles are internal or excluded', () => {
    const principles = [
      makeSimplePrinciple('principle-a'),
      makeSimplePrinciple('principle-b'),
      makeSimplePrinciple('principle-c'),
    ]

    const result = listCorePrinciples(principles, {})

    expect(result).toEqual(['principle-a', 'principle-b', 'principle-c'])
  })

  test('filters out internal principles', () => {
    const principles = [
      makeSimplePrinciple('public-one'),
      makeSimplePrinciple('internal-one', true),
      makeSimplePrinciple('public-two'),
    ]

    const result = listCorePrinciples(principles, {})

    expect(result).toEqual(['public-one', 'public-two'])
  })

  test('filters out excluded principles', () => {
    const principles = [
      makeSimplePrinciple('keep-me'),
      makeSimplePrinciple('exclude-me'),
      makeSimplePrinciple('keep-me-too'),
    ]

    const result = listCorePrinciples(principles, {
      excludeCorePrinciples: ['exclude-me'],
    })

    expect(result).toEqual(['keep-me', 'keep-me-too'])
  })

  test('filters out both internal and excluded principles', () => {
    const principles = [
      makeSimplePrinciple('public-keep'),
      makeSimplePrinciple('internal-one', true),
      makeSimplePrinciple('public-exclude'),
      makeSimplePrinciple('internal-two', true),
    ]

    const result = listCorePrinciples(principles, {
      excludeCorePrinciples: ['public-exclude'],
    })

    expect(result).toEqual(['public-keep'])
  })

  test('returns sorted slugs', () => {
    const principles = [
      makeSimplePrinciple('zebra'),
      makeSimplePrinciple('apple'),
      makeSimplePrinciple('mango'),
    ]

    const result = listCorePrinciples(principles, {})

    expect(result).toEqual(['apple', 'mango', 'zebra'])
  })

  test('handles empty exclude list', () => {
    const principles = [makeSimplePrinciple('one'), makeSimplePrinciple('two')]

    const result = listCorePrinciples(principles, {
      excludeCorePrinciples: [],
    })

    expect(result).toEqual(['one', 'two'])
  })

  test('handles empty principles array', () => {
    const result = listCorePrinciples([], {})
    expect(result).toEqual([])
  })
})

describe('getCorePrincipleTree', () => {
  test('returns roots for principles without parents', () => {
    const principles = [
      makePrincipleWithHierarchy('root-one'),
      makePrincipleWithHierarchy('root-two'),
    ]

    const result = getCorePrincipleTree(principles, {})

    expect(result).toHaveLength(2)
    expect(result[0].slug).toBe('root-one')
    expect(result[1].slug).toBe('root-two')
  })

  test('builds parent-child hierarchy', () => {
    const principles = [
      makePrincipleWithHierarchy('parent', {
        subPrinciples: ['child-a', 'child-b'],
      }),
      makePrincipleWithHierarchy('child-a', { parentPrinciple: 'parent' }),
      makePrincipleWithHierarchy('child-b', { parentPrinciple: 'parent' }),
    ]

    const result = getCorePrincipleTree(principles, {})

    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('parent')
    expect(result[0].children).toHaveLength(2)
    expect(result[0].children[0].slug).toBe('child-a')
    expect(result[0].children[1].slug).toBe('child-b')
  })

  test('filters out internal principles from tree', () => {
    const principles = [
      makePrincipleWithHierarchy('public-root'),
      makePrincipleWithHierarchy('internal-root', { internal: true }),
    ]

    const result = getCorePrincipleTree(principles, {})

    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('public-root')
  })

  test('promotes children to roots when parent is filtered', () => {
    const principles = [
      makePrincipleWithHierarchy('internal-parent', {
        internal: true,
        subPrinciples: ['public-child'],
      }),
      makePrincipleWithHierarchy('public-child', {
        parentPrinciple: 'internal-parent',
      }),
    ]

    const result = getCorePrincipleTree(principles, {})

    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('public-child')
    expect(result[0].children).toHaveLength(0)
  })

  test('filters out excluded principles', () => {
    const principles = [
      makePrincipleWithHierarchy('keep'),
      makePrincipleWithHierarchy('exclude'),
    ]

    const result = getCorePrincipleTree(principles, {
      excludeCorePrinciples: ['exclude'],
    })

    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('keep')
  })

  test('sorts nodes alphabetically by title', () => {
    const principles = [
      makePrincipleWithHierarchy('zebra-principle'),
      makePrincipleWithHierarchy('apple-principle'),
    ]

    const result = getCorePrincipleTree(principles, {})

    expect(result[0].slug).toBe('apple-principle')
    expect(result[1].slug).toBe('zebra-principle')
  })

  test('sorts children alphabetically by title', () => {
    const principles = [
      makePrincipleWithHierarchy('parent', {
        subPrinciples: ['child-z', 'child-a'],
      }),
      makePrincipleWithHierarchy('child-z', { parentPrinciple: 'parent' }),
      makePrincipleWithHierarchy('child-a', { parentPrinciple: 'parent' }),
    ]

    const result = getCorePrincipleTree(principles, {})

    expect(result[0].children[0].slug).toBe('child-a')
    expect(result[0].children[1].slug).toBe('child-z')
  })

  test('handles empty principles array', () => {
    const result = getCorePrincipleTree([], {})
    expect(result).toEqual([])
  })

  test('handles deep hierarchy', () => {
    const principles = [
      makePrincipleWithHierarchy('grandparent', { subPrinciples: ['parent'] }),
      makePrincipleWithHierarchy('parent', {
        parentPrinciple: 'grandparent',
        subPrinciples: ['child'],
      }),
      makePrincipleWithHierarchy('child', { parentPrinciple: 'parent' }),
    ]

    const result = getCorePrincipleTree(principles, {})

    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('grandparent')
    expect(result[0].children[0].slug).toBe('parent')
    expect(result[0].children[0].children[0].slug).toBe('child')
  })
})

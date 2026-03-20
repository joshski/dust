import { describe, expect, test } from 'vitest'
import {
  readAllCorePrinciples,
  getCorePrincipleSlugs,
  getCorePrincipleHierarchy,
  isInternalPrinciple,
  listCorePrinciples,
  getCorePrincipleTree,
  type CorePrincipleNode,
} from './core-principles'

/**
 * Recursively collects all slugs from a hierarchy of principle nodes.
 */
function collectSlugs(nodes: CorePrincipleNode[]): string[] {
  const slugs: string[] = []
  for (const node of nodes) {
    slugs.push(node.slug)
    slugs.push(...collectSlugs(node.children))
  }
  return slugs
}

describe('core-principles entry point', () => {
  describe('readAllCorePrinciples', () => {
    test('reads principles from the package directory', async () => {
      const principles = await readAllCorePrinciples()

      expect(principles.length).toBeGreaterThan(0)
      expect(principles[0]).toHaveProperty('slug')
      expect(principles[0]).toHaveProperty('title')
      expect(principles[0]).toHaveProperty('content')
      expect(principles[0]).toHaveProperty('parentPrinciple')
      expect(principles[0]).toHaveProperty('subPrinciples')
    })

    test('returns principles with valid structure', async () => {
      const principles = await readAllCorePrinciples()

      for (const principle of principles) {
        expect(typeof principle.slug).toBe('string')
        expect(typeof principle.title).toBe('string')
        expect(typeof principle.content).toBe('string')
        expect(
          principle.parentPrinciple === null ||
            typeof principle.parentPrinciple === 'string'
        ).toBe(true)
        expect(Array.isArray(principle.subPrinciples)).toBe(true)
      }
    })
  })

  describe('getCorePrincipleSlugs', () => {
    test('returns array of slugs', async () => {
      const slugs = await getCorePrincipleSlugs()

      expect(Array.isArray(slugs)).toBe(true)
      expect(slugs.length).toBeGreaterThan(0)
      for (const slug of slugs) {
        expect(typeof slug).toBe('string')
      }
    })

    test('filters out internal principles', async () => {
      const allPrinciples = await readAllCorePrinciples()
      const slugs = await getCorePrincipleSlugs()

      // Find principles marked as internal
      const internalSlugs = allPrinciples
        .filter(p => isInternalPrinciple(p.content))
        .map(p => p.slug)

      // None of the internal slugs should be in the result
      for (const internalSlug of internalSlugs) {
        expect(slugs).not.toContain(internalSlug)
      }
    })

    test('respects excludeCorePrinciples config', async () => {
      const allSlugs = await getCorePrincipleSlugs()
      const slugToExclude = allSlugs[0]

      const filteredSlugs = await getCorePrincipleSlugs({
        excludeCorePrinciples: [slugToExclude],
      })

      expect(filteredSlugs).not.toContain(slugToExclude)
      expect(filteredSlugs.length).toBe(allSlugs.length - 1)
    })
  })

  describe('getCorePrincipleHierarchy', () => {
    test('returns array of root nodes', async () => {
      const hierarchy = await getCorePrincipleHierarchy()

      expect(Array.isArray(hierarchy)).toBe(true)
      expect(hierarchy.length).toBeGreaterThan(0)
    })

    test('nodes have expected structure', async () => {
      const hierarchy = await getCorePrincipleHierarchy()

      for (const node of hierarchy) {
        expect(node).toHaveProperty('slug')
        expect(node).toHaveProperty('title')
        expect(node).toHaveProperty('children')
        expect(typeof node.slug).toBe('string')
        expect(typeof node.title).toBe('string')
        expect(Array.isArray(node.children)).toBe(true)
      }
    })

    test('excludes internal principles from hierarchy', async () => {
      const allPrinciples = await readAllCorePrinciples()
      const hierarchy = await getCorePrincipleHierarchy()

      const internalSlugs = new Set(
        allPrinciples
          .filter(p => isInternalPrinciple(p.content))
          .map(p => p.slug)
      )

      const hierarchySlugs = collectSlugs(hierarchy)
      for (const slug of hierarchySlugs) {
        expect(internalSlugs.has(slug)).toBe(false)
      }
    })

    test('respects excludeCorePrinciples config', async () => {
      const allHierarchy = await getCorePrincipleHierarchy()
      const slugToExclude = allHierarchy[0].slug

      const filteredHierarchy = await getCorePrincipleHierarchy({
        excludeCorePrinciples: [slugToExclude],
      })

      const filteredSlugs = collectSlugs(filteredHierarchy)
      expect(filteredSlugs).not.toContain(slugToExclude)
    })
  })

  describe('re-exported pure functions', () => {
    test('isInternalPrinciple is re-exported', () => {
      expect(typeof isInternalPrinciple).toBe('function')
    })

    test('listCorePrinciples is re-exported', () => {
      expect(typeof listCorePrinciples).toBe('function')
    })

    test('getCorePrincipleTree is re-exported', () => {
      expect(typeof getCorePrincipleTree).toBe('function')
    })
  })
})

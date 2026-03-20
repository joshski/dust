/**
 * Core Principles Reading API
 *
 * Provides pure functional access to dust's core principles bundled with the package.
 * Filters out Internal principles and respects user exclusion configuration.
 */

import type { Principle } from './principles'

/**
 * Recursively sorts principle nodes alphabetically by title.
 */
function sortNodes(nodes: CorePrincipleNode[]): void {
  nodes.sort((a, b) => a.title.localeCompare(b.title))
  for (const node of nodes) {
    sortNodes(node.children)
  }
}

/**
 * Configuration for filtering core principles
 */
export interface CorePrinciplesConfig {
  excludeCorePrinciples?: string[]
}

/**
 * Node in the principle hierarchy tree
 */
export interface CorePrincipleNode {
  slug: string
  title: string
  children: CorePrincipleNode[]
}

/**
 * Checks if a principle is marked as Internal.
 * Internal principles have `## Applicability` section containing "Internal".
 */
export function isInternalPrinciple(principleContent: string): boolean {
  const lines = principleContent.split('\n')
  let inApplicabilitySection = false

  for (const line of lines) {
    if (line.startsWith('## ')) {
      inApplicabilitySection = line.trimEnd() === '## Applicability'
      continue
    }

    if (inApplicabilitySection) {
      // Stop at next heading
      if (line.startsWith('# ')) break

      // Check for "Internal" on its own line
      if (line.trim() === 'Internal') {
        return true
      }
    }
  }

  return false
}

/**
 * Filters principles to include only public, non-excluded ones.
 * Returns slugs of principles that pass the filter.
 */
export function listCorePrinciples(
  allPrinciples: Principle[],
  config: CorePrinciplesConfig
): string[] {
  const excludeSet = new Set(config.excludeCorePrinciples ?? [])

  return allPrinciples
    .filter(p => !isInternalPrinciple(p.content) && !excludeSet.has(p.slug))
    .map(p => p.slug)
    .toSorted()
}

/**
 * Builds a hierarchy tree of public, non-excluded principles.
 * Returns root nodes (principles with no parent).
 */
export function getCorePrincipleTree(
  allPrinciples: Principle[],
  config: CorePrinciplesConfig
): CorePrincipleNode[] {
  const excludeSet = new Set(config.excludeCorePrinciples ?? [])

  // Filter to public, non-excluded principles
  const filteredPrinciples = allPrinciples.filter(
    p => !isInternalPrinciple(p.content) && !excludeSet.has(p.slug)
  )

  const filteredSlugs = new Set(filteredPrinciples.map(p => p.slug))

  // Build nodes for each principle
  const nodeBySlug = new Map<string, CorePrincipleNode>()
  for (const p of filteredPrinciples) {
    nodeBySlug.set(p.slug, {
      slug: p.slug,
      title: p.title,
      children: [],
    })
  }

  // Wire up parent-child relationships
  const roots: CorePrincipleNode[] = []
  for (const p of filteredPrinciples) {
    const node = nodeBySlug.get(p.slug)!
    const parentSlug = p.parentPrinciple

    // A principle is a root if it has no parent, or its parent is filtered out
    if (!parentSlug || !filteredSlugs.has(parentSlug)) {
      roots.push(node)
    } else {
      /* v8 ignore start -- defensive guard; parentSlug is always in filteredSlugs here */
      const parentNode = nodeBySlug.get(parentSlug)
      if (parentNode) {
        parentNode.children.push(node)
      }
      /* v8 ignore stop */
    }
  }

  // Sort roots and children alphabetically by title
  sortNodes(roots)

  return roots
}

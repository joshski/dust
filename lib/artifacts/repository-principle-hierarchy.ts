/**
 * Repository Principle Hierarchy API
 *
 * Provides pure functional access to build hierarchical trees of principles
 * from a repository's .dust/principles/ directory.
 */

import type { ReadOnlyArtifactsRepository } from './index'

/**
 * Recursively sorts principle nodes alphabetically by title.
 */
function sortNodes(nodes: RepositoryPrincipleNode[]): void {
  nodes.sort((a, b) => a.title.localeCompare(b.title))
  for (const node of nodes) {
    sortNodes(node.children)
  }
}

/**
 * Node in the principle hierarchy tree
 */
export interface RepositoryPrincipleNode {
  slug: string
  title: string
  children: RepositoryPrincipleNode[]
}

/**
 * Builds a hierarchy tree of repository principles from .dust/principles/.
 * Returns root nodes (principles with no parent or filtered parent).
 * Children are sorted alphabetically by title (recursive).
 *
 * @param repository - The repository to read principles from
 * @returns Array of root principle nodes, empty array if no principles exist
 */
export async function getRepositoryPrincipleHierarchy(
  repository: ReadOnlyArtifactsRepository
): Promise<RepositoryPrincipleNode[]> {
  // Get all principle slugs from the repository
  const slugs = await repository.listPrinciples()

  // Return empty array if no principles exist
  if (slugs.length === 0) {
    return []
  }

  // Parse all principles
  const principles = await Promise.all(
    slugs.map(slug => repository.parsePrinciple({ slug }))
  )

  const principleSet = new Set(slugs)

  // Build nodes for each principle
  const nodeBySlug = new Map<string, RepositoryPrincipleNode>()
  for (const p of principles) {
    nodeBySlug.set(p.slug, {
      slug: p.slug,
      title: p.title,
      children: [],
    })
  }

  // Wire up parent-child relationships
  const roots: RepositoryPrincipleNode[] = []
  for (const p of principles) {
    const node = nodeBySlug.get(p.slug)!
    const parentSlug = p.parentPrinciple

    // A principle is a root if it has no parent, or its parent is not in the set
    if (!parentSlug || !principleSet.has(parentSlug)) {
      roots.push(node)
    } else {
      // parentSlug is in principleSet, so nodeBySlug always has it
      nodeBySlug.get(parentSlug)!.children.push(node)
    }
  }

  // Sort roots and children alphabetically by title
  sortNodes(roots)

  return roots
}

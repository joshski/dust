/**
 * Core Principles Reading API - Entry point
 *
 * Reads principles from bundled JavaScript module (no file system access needed).
 */

import { BUNDLED_PRINCIPLES } from './bundled-core-principles'
import type { Principle } from './artifacts/principles'
import {
  extractTitle,
  MARKDOWN_LINK_PATTERN,
} from './markdown/markdown-utilities'
import {
  type CorePrinciplesConfig,
  type CorePrincipleNode,
  isInternalPrinciple,
  listCorePrinciples,
  getCorePrincipleTree,
} from './artifacts/core-principles'

// Re-export types and pure functions
export type { CorePrinciplesConfig, CorePrincipleNode, Principle }
export { isInternalPrinciple, listCorePrinciples, getCorePrincipleTree }

/**
 * Extracts link targets from a section of markdown.
 * Returns an array of slugs derived from the link targets.
 */
function extractLinksFromSection(
  content: string,
  sectionHeading: string
): string[] {
  const lines = content.split('\n')
  const links: string[] = []

  let inSection = false

  for (const line of lines) {
    // Check for h2 headings
    if (line.startsWith('## ')) {
      inSection = line.trimEnd() === `## ${sectionHeading}`
      continue
    }

    if (!inSection) continue

    // Stop at next h2 or h1
    /* istanbul ignore next @preserve -- only triggers for malformed principles with content after h1 */
    if (line.startsWith('# ')) break

    // Look for markdown links
    const linkMatch = line.match(MARKDOWN_LINK_PATTERN)
    if (linkMatch) {
      const target = linkMatch[2]
      // Extract slug from relative path like '../principles/some-principle.md'
      // or 'some-principle.md'
      const slugMatch = target.match(/([^/]+)\.md$/)
      /* istanbul ignore else @preserve -- all core principles links have .md extension */
      if (slugMatch) {
        links.push(slugMatch[1])
      }
    }
  }

  return links
}

/**
 * Extracts a single link from a section, or null if none/multiple exist.
 */
function extractSingleLinkFromSection(
  content: string,
  sectionHeading: string
): string | null {
  const links = extractLinksFromSection(content, sectionHeading)
  return links.length === 1 ? links[0] : null
}

/**
 * Parses principle content into a structured Principle object.
 */
function parsePrincipleContent(slug: string, content: string): Principle {
  const title = extractTitle(content)
  /* istanbul ignore next @preserve -- all bundled principles have valid titles */
  if (!title) {
    throw new Error(`Principle has no title: ${slug}`)
  }

  const parentPrinciple = extractSingleLinkFromSection(
    content,
    'Parent Principle'
  )
  const subPrinciples = extractLinksFromSection(content, 'Sub-Principles')

  return {
    slug,
    title,
    content,
    parentPrinciple,
    subPrinciples,
  }
}

/**
 * Reads all principles from the bundled module.
 * No file system access required.
 */
export async function readAllCorePrinciples(): Promise<Principle[]> {
  return BUNDLED_PRINCIPLES.map(({ slug, content }) =>
    parsePrincipleContent(slug, content)
  )
}

/**
 * Returns slugs of all public (non-Internal) core principles,
 * filtered by the provided configuration.
 */
export async function getCorePrincipleSlugs(
  config: CorePrinciplesConfig = {}
): Promise<string[]> {
  const allPrinciples = await readAllCorePrinciples()
  return listCorePrinciples(allPrinciples, config)
}

/**
 * Returns a hierarchy tree of all public (non-Internal) core principles,
 * filtered by the provided configuration.
 */
export async function getCorePrincipleHierarchy(
  config: CorePrinciplesConfig = {}
): Promise<CorePrincipleNode[]> {
  const allPrinciples = await readAllCorePrinciples()
  return getCorePrincipleTree(allPrinciples, config)
}

/**
 * Principle serialization and patch building functions.
 */

export interface PrincipleInput {
  title: string
  body?: string
  parentPrinciple?: string | null // principle slug, null for root
  subPrinciples?: string[] // principle slugs
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function renderParentPrincipleSection(parentPrinciple: string | null): string {
  if (parentPrinciple === null || parentPrinciple === undefined) {
    return '## Parent Principle\n\n- (none)\n'
  }
  const title = slugToTitle(parentPrinciple)
  return `## Parent Principle\n\n- [${title}](${parentPrinciple}.md)\n`
}

function renderSubPrinciplesSection(subPrinciples: string[]): string {
  if (subPrinciples.length === 0) {
    return '## Sub-Principles\n\n- (none)\n'
  }
  const links = subPrinciples.map(slug => {
    const title = slugToTitle(slug)
    return `- [${title}](${slug}.md)`
  })
  return `## Sub-Principles\n\n${links.join('\n')}\n`
}

/**
 * Serializes a PrincipleInput object to markdown format.
 */
export function serializePrinciple(input: PrincipleInput): string {
  const sections: string[] = []

  sections.push(`# ${input.title}`)

  if (input.body) {
    sections.push(input.body)
  }

  sections.push(renderParentPrincipleSection(input.parentPrinciple ?? null))
  sections.push(renderSubPrinciplesSection(input.subPrinciples ?? []))

  return sections.join('\n\n')
}

/**
 * Builds file entries for a principle artifact patch.
 */
export function buildPrincipleFiles(
  input: PrincipleInput,
  slug: string
): Record<string, string> {
  const content = serializePrinciple(input)
  return {
    [`principles/${slug}.md`]: content,
  }
}

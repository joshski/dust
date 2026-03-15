/**
 * Builder functions to generate markdown content for tasks, principles, ideas, and facts files.
 * These make e2e test data more readable and maintainable.
 */

type Link = { name: string; path: string }

interface TaskOptions {
  title: string
  description?: string
  principles?: Link[] | '(none)'
  blockedBy?: Link[] | '(none)'
  definitionOfDone?: string[]
}

interface PrincipleOptions {
  title: string
  description: string
  parentPrinciple?: Link | '(none)'
  subPrinciples?: Link[] | '(none)'
}

interface IdeaOptions {
  title: string
  description: string
}

function formatLinks(links: Link[] | '(none)' | undefined): string {
  if (links === '(none)' || links === undefined || links.length === 0) {
    return '(none)'
  }
  return links.map(link => `- [${link.name}](${link.path})`).join('\n')
}

function formatChecklist(items: string[]): string {
  return items.map(item => `- ${item}`).join('\n')
}

export function buildTask(options: TaskOptions): string {
  const {
    title,
    description,
    principles = '(none)',
    blockedBy = '(none)',
    definitionOfDone = ['Task complete'],
  } = options

  const descriptionSection = description ? `\n${description}\n` : ''

  return `# ${title}
${descriptionSection}
## Principles

${formatLinks(principles)}

## Blocked By

${formatLinks(blockedBy)}

## Definition of Done

${formatChecklist(definitionOfDone)}
`
}

export function buildPrinciple(options: PrincipleOptions): string {
  const { title, description, parentPrinciple, subPrinciples } = options

  // If parentPrinciple or subPrinciples is specified, include those sections
  if (parentPrinciple !== undefined || subPrinciples !== undefined) {
    const parentSection =
      parentPrinciple === '(none)' || parentPrinciple === undefined
        ? '(none)'
        : `- [${parentPrinciple.name}](${parentPrinciple.path})`
    const subPrinciplesSection = formatLinks(subPrinciples)

    return `# ${title}

${description}

## Parent Principle

${parentSection}

## Sub-Principles

${subPrinciplesSection}
`
  }

  return `# ${title}

${description}
`
}

export function buildIdea(options: IdeaOptions): string {
  const { title, description } = options
  return `# ${title}

${description}
`
}

/**
 * Builder functions to generate markdown content for tasks, goals, ideas, and facts files.
 * These make e2e test data more readable and maintainable.
 */

type Link = { name: string; path: string }

interface TaskOptions {
  title: string
  description?: string
  goals?: Link[] | '(none)'
  blockedBy?: Link[] | '(none)'
  definitionOfDone?: string[]
}

interface GoalOptions {
  title: string
  description: string
  parentGoal?: Link | '(none)'
  subGoals?: Link[] | '(none)'
}

interface IdeaOptions {
  title: string
  description: string
}

interface FactOptions {
  title: string
  content: string
}

function formatLinks(links: Link[] | '(none)' | undefined): string {
  if (links === '(none)' || links === undefined || links.length === 0) {
    return '(none)'
  }
  return links.map(link => `- [${link.name}](${link.path})`).join('\n')
}

function formatChecklist(items: string[]): string {
  return items.map(item => `- [ ] ${item}`).join('\n')
}

export function buildTask(options: TaskOptions): string {
  const {
    title,
    description,
    goals = '(none)',
    blockedBy = '(none)',
    definitionOfDone = ['Task complete'],
  } = options

  const descriptionSection = description ? `\n${description}\n` : ''

  return `# ${title}
${descriptionSection}
## Goals

${formatLinks(goals)}

## Blocked by

${formatLinks(blockedBy)}

## Definition of done

${formatChecklist(definitionOfDone)}
`
}

export function buildGoal(options: GoalOptions): string {
  const { title, description, parentGoal, subGoals } = options

  // If parentGoal or subGoals is specified, include those sections
  if (parentGoal !== undefined || subGoals !== undefined) {
    const parentSection =
      parentGoal === '(none)' || parentGoal === undefined
        ? '(none)'
        : `- [${parentGoal.name}](${parentGoal.path})`
    const subGoalsSection = formatLinks(subGoals)

    return `# ${title}

${description}

## Parent Goal

${parentSection}

## Sub-Goals

${subGoalsSection}
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

export function buildFact(options: FactOptions): string {
  const { title, content } = options
  return `# ${title}

${content}
`
}

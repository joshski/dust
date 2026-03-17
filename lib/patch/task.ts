/**
 * Task serialization and patch building functions.
 */

export interface StandardTaskInput {
  type?: undefined
  title: string
  body?: string
  blockedBy?: string[]
  principles?: string[]
  definitionOfDone: string[]
}

export interface WorkflowTaskInput {
  type: 'capture-idea' | 'refine-idea' | 'decompose-idea' | 'shelve-idea'
  ideaSlug: string
  definitionOfDone?: string[]
}

export type TaskInput = StandardTaskInput | WorkflowTaskInput

const WORKFLOW_SECTION_HEADINGS: Record<string, string> = {
  'capture-idea': 'Captures Idea',
  'refine-idea': 'Refines Idea',
  'decompose-idea': 'Decomposes Idea',
  'shelve-idea': 'Shelves Idea',
}

const WORKFLOW_TITLE_PREFIXES: Record<string, string> = {
  'capture-idea': 'Add Idea: ',
  'refine-idea': 'Refine Idea: ',
  'decompose-idea': 'Decompose Idea: ',
  'shelve-idea': 'Shelve Idea: ',
}

const WORKFLOW_OPENING_SENTENCES: Record<string, string> = {
  'capture-idea': 'Research this idea thoroughly and create an idea file.',
  'refine-idea':
    'Thoroughly research this idea and refine it into a well-defined proposal.',
  'decompose-idea': 'Create one or more well-defined tasks from this idea.',
  'shelve-idea': 'Archive this idea and remove it from the active backlog.',
}

const WORKFLOW_DEFAULT_DEFINITION_OF_DONE: Record<string, string[]> = {
  'capture-idea': ['Idea file is created in .dust/ideas/'],
  'refine-idea': [
    'Idea is thoroughly researched with relevant codebase context',
  ],
  'decompose-idea': ['One or more new tasks are created in .dust/tasks/'],
  'shelve-idea': ['Idea file is deleted'],
}

function ideaSlugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function renderPrinciplesSection(principles: string[]): string {
  const links = principles.map(
    slug => `- [${ideaSlugToTitle(slug)}](../principles/${slug}.md)`
  )
  return `## Principles\n\n${links.join('\n')}\n`
}

function renderBlockedBySection(blockedBy: string[]): string {
  if (blockedBy.length === 0) {
    return '## Blocked By\n\n(none)\n'
  }
  const links = blockedBy.map(
    slug => `- [${ideaSlugToTitle(slug)}](${slug}.md)`
  )
  return `## Blocked By\n\n${links.join('\n')}\n`
}

function renderDefinitionOfDoneSection(items: string[]): string {
  return `## Definition of Done\n\n${items.map(item => `- ${item}`).join('\n')}\n`
}

function serializeStandardTask(input: StandardTaskInput): string {
  const sections: string[] = []

  sections.push(`# ${input.title}`)

  if (input.body) {
    sections.push(input.body)
  }

  if (input.principles && input.principles.length > 0) {
    sections.push(renderPrinciplesSection(input.principles))
  }

  sections.push(renderBlockedBySection(input.blockedBy ?? []))
  sections.push(renderDefinitionOfDoneSection(input.definitionOfDone))

  return sections.join('\n\n')
}

function serializeWorkflowTask(input: WorkflowTaskInput): string {
  const ideaTitle = ideaSlugToTitle(input.ideaSlug)
  const prefix = WORKFLOW_TITLE_PREFIXES[input.type]
  const title = `${prefix}${ideaTitle}`
  const openingSentence = WORKFLOW_OPENING_SENTENCES[input.type]
  const sectionHeading = WORKFLOW_SECTION_HEADINGS[input.type]
  const definitionOfDone =
    input.definitionOfDone ?? WORKFLOW_DEFAULT_DEFINITION_OF_DONE[input.type]

  const ideaSection = `## ${sectionHeading}\n\n- [${ideaTitle}](../ideas/${input.ideaSlug}.md)`

  return `# ${title}

${openingSentence}

${ideaSection}

## Blocked By

(none)

## Definition of Done

${definitionOfDone.map(item => `- ${item}`).join('\n')}
`
}

/**
 * Serializes a TaskInput object to markdown format.
 */
export function serializeTask(input: TaskInput): string {
  if (input.type) {
    return serializeWorkflowTask(input)
  }
  return serializeStandardTask(input)
}

/**
 * Builds file entries for a task artifact patch.
 */
export function buildTaskFiles(
  input: TaskInput,
  slug: string
): Record<string, string> {
  const content = serializeTask(input)
  return {
    [`tasks/${slug}.md`]: content,
  }
}

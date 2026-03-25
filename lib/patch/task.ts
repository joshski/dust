/**
 * Task serialization and patch building functions.
 */

import type { TaskType } from '../artifacts/workflow-tasks'

export interface StandardTaskInput {
  type?: undefined
  title: string
  body?: string
  blockedBy?: string[]
  principles?: string[]
  definitionOfDone: string[]
}

export interface WorkflowTaskInput {
  type: Extract<TaskType, 'capture' | 'refine' | 'decompose' | 'shelve'>
  ideaSlug: string
  definitionOfDone?: string[]
}

export type TaskInput = StandardTaskInput | WorkflowTaskInput

const WORKFLOW_SECTION_HEADINGS: Record<string, string> = {
  capture: 'Captures Idea',
  refine: 'Refines Idea',
  decompose: 'Decomposes Idea',
  shelve: 'Shelves Idea',
}

const WORKFLOW_TITLE_PREFIXES: Record<string, string> = {
  capture: 'Add Idea: ',
  refine: 'Refine Idea: ',
  decompose: 'Decompose Idea: ',
  shelve: 'Shelve Idea: ',
}

const WORKFLOW_OPENING_SENTENCES: Record<string, string> = {
  capture: 'Research this idea thoroughly and create an idea file.',
  refine:
    'Thoroughly research this idea and refine it into a well-defined proposal.',
  decompose: 'Create one or more well-defined tasks from this idea.',
  shelve: 'Archive this idea and remove it from the active backlog.',
}

const WORKFLOW_DEFAULT_DEFINITION_OF_DONE: Record<string, string[]> = {
  capture: ['Idea file is created in .dust/ideas/'],
  refine: ['Idea is thoroughly researched with relevant codebase context'],
  decompose: ['One or more new tasks are created in .dust/tasks/'],
  shelve: ['Idea file is deleted'],
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

  sections.push('## Task Type\n\nimplement')
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

## Task Type

${input.type}

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

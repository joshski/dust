import type { FileSystem } from './cli/types'

export const IDEA_TRANSITION_PREFIXES = [
  'Refine Idea: ',
  'Decompose Idea: ',
  'Shelve Idea: ',
]

export const CAPTURE_IDEA_PREFIX = 'Add Idea: '

export interface IdeaInProgress {
  taskSlug: string
  ideaTitle: string
}

export async function findAllCaptureIdeaTasks(
  fileSystem: FileSystem,
  dustPath: string
): Promise<IdeaInProgress[]> {
  const tasksPath = `${dustPath}/tasks`
  if (!fileSystem.exists(tasksPath)) return []

  const files = await fileSystem.readdir(tasksPath)
  const results: IdeaInProgress[] = []

  for (const file of files.filter(f => f.endsWith('.md')).sort()) {
    const content = await fileSystem.readFile(`${tasksPath}/${file}`)
    const titleMatch = content.match(/^#\s+(.+)$/m)
    if (!titleMatch) continue

    const title = titleMatch[1].trim()
    if (title.startsWith(CAPTURE_IDEA_PREFIX)) {
      results.push({
        taskSlug: file.replace(/\.md$/, ''),
        ideaTitle: title.slice(CAPTURE_IDEA_PREFIX.length),
      })
    }
  }

  return results
}

/**
 * Converts a markdown title to the expected filename using deterministic rules:
 * 1. Convert to lowercase
 * 2. Replace dots with hyphens (before removing other special chars)
 * 3. Remove characters that aren't alphanumeric, spaces, or hyphens
 * 4. Replace spaces with hyphens
 * 5. Collapse multiple consecutive hyphens
 * 6. Add .md extension
 */
export function titleToFilename(title: string): string {
  return `${title
    .toLowerCase()
    .replace(/\./g, '-')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')}.md`
}

export type WorkflowTaskType = 'refine' | 'decompose-idea' | 'shelve'

export interface WorkflowTaskMatch {
  type: WorkflowTaskType
  ideaSlug: string
  taskSlug: string
}

const WORKFLOW_TASK_TYPES: { type: WorkflowTaskType; prefix: string }[] = [
  { type: 'refine', prefix: 'Refine Idea: ' },
  { type: 'decompose-idea', prefix: 'Decompose Idea: ' },
  { type: 'shelve', prefix: 'Shelve Idea: ' },
]

export async function findWorkflowTaskForIdea(
  fileSystem: FileSystem,
  dustPath: string,
  ideaSlug: string
): Promise<WorkflowTaskMatch | null> {
  const ideaTitle = await readIdeaTitle(fileSystem, dustPath, ideaSlug)

  for (const { type, prefix } of WORKFLOW_TASK_TYPES) {
    const filename = titleToFilename(`${prefix}${ideaTitle}`)
    const filePath = `${dustPath}/tasks/${filename}`
    if (fileSystem.exists(filePath)) {
      const taskSlug = filename.replace(/\.md$/, '')
      return { type, ideaSlug, taskSlug }
    }
  }

  return null
}

export interface CreateIdeaTransitionTaskResult {
  filePath: string
}

export interface OpenQuestionResponse {
  question: string
  chosenOption: string
}

export interface DecomposeIdeaOptions {
  ideaSlug: string
  description?: string
  openQuestionResponses?: OpenQuestionResponse[]
}

async function readIdeaTitle(
  fileSystem: FileSystem,
  dustPath: string,
  ideaSlug: string
): Promise<string> {
  const ideaPath = `${dustPath}/ideas/${ideaSlug}.md`
  if (!fileSystem.exists(ideaPath)) {
    throw new Error(
      `Idea not found: "${ideaSlug}" (expected file at ${ideaPath})`
    )
  }

  const ideaContent = await fileSystem.readFile(ideaPath)
  const ideaTitleMatch = ideaContent.match(/^#\s+(.+)$/m)
  if (!ideaTitleMatch) {
    throw new Error(`Idea file has no title: ${ideaPath}`)
  }
  return ideaTitleMatch[1].trim()
}

function renderResolvedQuestions(responses: OpenQuestionResponse[]): string {
  const sections = responses.map(
    r => `### ${r.question}\n\n**Decision:** ${r.chosenOption}`
  )
  return `## Resolved Questions\n\n${sections.join('\n\n')}\n`
}

function renderTask(
  title: string,
  openingSentence: string,
  definitionOfDone: string[],
  options?: { description?: string; resolvedQuestions?: OpenQuestionResponse[] }
): string {
  const descriptionParagraph =
    options?.description !== undefined ? `\n${options.description}\n` : ''

  const resolvedSection =
    options?.resolvedQuestions && options.resolvedQuestions.length > 0
      ? `\n${renderResolvedQuestions(options.resolvedQuestions)}\n`
      : ''

  return `# ${title}

${openingSentence}
${descriptionParagraph}${resolvedSection}
## Goals

(none)

## Blocked By

(none)

## Definition of Done

${definitionOfDone.map(item => `- [ ] ${item}`).join('\n')}
`
}

async function createIdeaTask(
  fileSystem: FileSystem,
  dustPath: string,
  prefix: string,
  ideaSlug: string,
  openingSentenceTemplate: (ideaTitle: string) => string,
  definitionOfDone: string[],
  taskOptions?: {
    description?: string
    resolvedQuestions?: OpenQuestionResponse[]
  }
): Promise<CreateIdeaTransitionTaskResult> {
  const ideaTitle = await readIdeaTitle(fileSystem, dustPath, ideaSlug)
  const taskTitle = `${prefix}${ideaTitle}`
  const filename = titleToFilename(taskTitle)
  const filePath = `${dustPath}/tasks/${filename}`
  const openingSentence = openingSentenceTemplate(ideaTitle)

  const content = renderTask(
    taskTitle,
    openingSentence,
    definitionOfDone,
    taskOptions
  )
  await fileSystem.writeFile(filePath, content)
  return { filePath }
}

export async function createRefineIdeaTask(
  fileSystem: FileSystem,
  dustPath: string,
  ideaSlug: string,
  description?: string
): Promise<CreateIdeaTransitionTaskResult> {
  return createIdeaTask(
    fileSystem,
    dustPath,
    'Refine Idea: ',
    ideaSlug,
    ideaTitle =>
      `Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review \`.dust/goals/\` for alignment and \`.dust/facts/\` for relevant design decisions. See [${ideaTitle}](../ideas/${ideaSlug}.md).`,
    [
      'Idea is thoroughly researched with relevant codebase context',
      'Open questions are added for any ambiguous or underspecified aspects',
      'Idea file is updated with findings',
    ],
    { description }
  )
}

export async function decomposeIdea(
  fileSystem: FileSystem,
  dustPath: string,
  options: DecomposeIdeaOptions
): Promise<CreateIdeaTransitionTaskResult> {
  return createIdeaTask(
    fileSystem,
    dustPath,
    'Decompose Idea: ',
    options.ideaSlug,
    ideaTitle =>
      `Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks -- split the idea into multiple tasks if it covers more than one logical change. Review \`.dust/goals/\` to link relevant goals and \`.dust/facts/\` for design decisions that should inform the task. See [${ideaTitle}](../ideas/${options.ideaSlug}.md).`,
    [
      'One or more new tasks are created in .dust/tasks/',
      "Task's Goals section links to relevant goals from .dust/goals/",
      'The original idea is deleted or updated to reflect remaining scope',
    ],
    {
      description: options.description,
      resolvedQuestions: options.openQuestionResponses,
    }
  )
}

export async function createShelveIdeaTask(
  fileSystem: FileSystem,
  dustPath: string,
  ideaSlug: string,
  description?: string
): Promise<CreateIdeaTransitionTaskResult> {
  return createIdeaTask(
    fileSystem,
    dustPath,
    'Shelve Idea: ',
    ideaSlug,
    ideaTitle =>
      `Archive this idea and remove it from the active backlog. See [${ideaTitle}](../ideas/${ideaSlug}.md).`,
    ['Idea file is deleted', 'Rationale is recorded in the commit message'],
    { description }
  )
}

export async function createCaptureIdeaTask(
  fileSystem: FileSystem,
  dustPath: string,
  title: string,
  description: string
): Promise<CreateIdeaTransitionTaskResult> {
  if (!title || !title.trim()) {
    throw new Error('title is required and must not be whitespace-only')
  }
  if (!description || !description.trim()) {
    throw new Error('description is required and must not be whitespace-only')
  }

  const taskTitle = `Add Idea: ${title}`
  const filename = titleToFilename(taskTitle)
  const filePath = `${dustPath}/tasks/${filename}`
  const ideaFilename = titleToFilename(title)
  const ideaPath = `.dust/ideas/${ideaFilename}`

  const content = `# ${taskTitle}

Research this idea thoroughly, then create an idea file at \`${ideaPath}\`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review \`.dust/goals/\` and \`.dust/facts/\` for relevant context.

## Idea Description

${description}

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file exists at ${ideaPath}
- [ ] Idea file has an H1 title matching "${title}"
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
`
  await fileSystem.writeFile(filePath, content)
  return { filePath }
}

import type { FileSystem, ReadableFileSystem } from '../filesystem/types'
import { MARKDOWN_LINK_PATTERN } from '../markdown/markdown-utilities'

export const IDEA_TRANSITION_PREFIXES = [
  'Refine Idea: ',
  'Decompose Idea: ',
  'Shelve Idea: ',
]

export const CAPTURE_IDEA_PREFIX = 'Add Idea: '
export const BUILD_IDEA_PREFIX = 'Build Idea: '

export interface IdeaInProgress {
  taskSlug: string
  ideaTitle: string
}

export interface ParsedCaptureIdeaTask {
  ideaTitle: string
  ideaDescription: string
  buildItNow: boolean
}

export async function findAllCaptureIdeaTasks(
  fileSystem: ReadableFileSystem,
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
    } else if (title.startsWith(BUILD_IDEA_PREFIX)) {
      results.push({
        taskSlug: file.replace(/\.md$/, ''),
        ideaTitle: title.slice(BUILD_IDEA_PREFIX.length),
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

const WORKFLOW_SECTION_HEADINGS: { type: WorkflowTaskType; heading: string }[] =
  [
    { type: 'refine', heading: 'Refines Idea' },
    { type: 'decompose-idea', heading: 'Decomposes Idea' },
    { type: 'shelve', heading: 'Shelves Idea' },
  ]

function extractIdeaSlugFromSection(
  content: string,
  sectionHeading: string
): string | null {
  const lines = content.split('\n')
  let inSection = false

  for (const line of lines) {
    if (line.startsWith('## ')) {
      inSection = line.trimEnd() === `## ${sectionHeading}`
      continue
    }

    if (!inSection) continue

    if (line.startsWith('# ')) break

    const linkMatch = line.match(MARKDOWN_LINK_PATTERN)
    if (linkMatch) {
      const target = linkMatch[2]
      const slugMatch = target.match(/([^/]+)\.md$/)
      if (slugMatch) {
        return slugMatch[1]
      }
    }
  }

  return null
}

export async function findWorkflowTaskForIdea(
  fileSystem: ReadableFileSystem,
  dustPath: string,
  ideaSlug: string
): Promise<WorkflowTaskMatch | null> {
  const ideaPath = `${dustPath}/ideas/${ideaSlug}.md`
  if (!fileSystem.exists(ideaPath)) {
    throw new Error(
      `Idea not found: "${ideaSlug}" (expected file at ${ideaPath})`
    )
  }

  const tasksPath = `${dustPath}/tasks`
  if (!fileSystem.exists(tasksPath)) {
    return null
  }

  const files = await fileSystem.readdir(tasksPath)

  for (const file of files.filter(f => f.endsWith('.md')).sort()) {
    const content = await fileSystem.readFile(`${tasksPath}/${file}`)

    for (const { type, heading } of WORKFLOW_SECTION_HEADINGS) {
      const linkedSlug = extractIdeaSlugFromSection(content, heading)
      if (linkedSlug === ideaSlug) {
        const taskSlug = file.replace(/\.md$/, '')
        return { type, ideaSlug, taskSlug }
      }
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
  fileSystem: ReadableFileSystem,
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

interface IdeaSection {
  heading: string
  ideaTitle: string
  ideaSlug: string
}

function renderIdeaSection(ideaSection: IdeaSection): string {
  return `## ${ideaSection.heading}

- [${ideaSection.ideaTitle}](../ideas/${ideaSection.ideaSlug}.md)
`
}

function renderTask(
  title: string,
  openingSentence: string,
  definitionOfDone: string[],
  ideaSection: IdeaSection,
  options?: {
    description?: string
    resolvedQuestions?: OpenQuestionResponse[]
  }
): string {
  const descriptionParagraph =
    options?.description !== undefined ? `\n${options.description}\n` : ''

  const resolvedSection =
    options?.resolvedQuestions && options.resolvedQuestions.length > 0
      ? `\n${renderResolvedQuestions(options.resolvedQuestions)}\n`
      : ''

  const ideaSectionContent = `\n${renderIdeaSection(ideaSection)}\n`

  return `# ${title}

${openingSentence}
${descriptionParagraph}${resolvedSection}${ideaSectionContent}## Blocked By

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
  ideaSectionHeading: string,
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

  const ideaSection = { heading: ideaSectionHeading, ideaTitle, ideaSlug }

  const content = renderTask(
    taskTitle,
    openingSentence,
    definitionOfDone,
    ideaSection,
    {
      description: taskOptions?.description,
      resolvedQuestions: taskOptions?.resolvedQuestions,
    }
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
      `Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review \`.dust/principles/\` for alignment and \`.dust/facts/\` for relevant design decisions. See [${ideaTitle}](../ideas/${ideaSlug}.md). If you add open questions, use \`## Open Questions\` with \`### Question?\` headings and one or more \`#### Option\` headings beneath each question, and only add questions that are meaningful decisions worth asking.`,
    [
      'Idea is thoroughly researched with relevant codebase context',
      'Open questions are added for any ambiguous or underspecified aspects',
      'Open questions follow the required heading format and focus on high-value decisions',
      'Idea file is updated with findings',
    ],
    'Refines Idea',
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
      `Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Review \`.dust/principles/\` to link relevant principles and \`.dust/facts/\` for design decisions that should inform the task. See [${ideaTitle}](../ideas/${options.ideaSlug}.md).`,
    [
      'One or more new tasks are created in .dust/tasks/',
      "Task's Principles section links to relevant principles from .dust/principles/",
      'The original idea is deleted or updated to reflect remaining scope',
    ],
    'Decomposes Idea',
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
    'Shelves Idea',
    { description }
  )
}

export async function createCaptureIdeaTask(
  fileSystem: FileSystem,
  dustPath: string,
  options: { title: string; description: string; buildItNow?: boolean }
): Promise<CreateIdeaTransitionTaskResult> {
  const { title, description, buildItNow } = options
  if (!title || !title.trim()) {
    throw new Error('title is required and must not be whitespace-only')
  }
  if (!description || !description.trim()) {
    throw new Error('description is required and must not be whitespace-only')
  }

  if (buildItNow) {
    const taskTitle = `${BUILD_IDEA_PREFIX}${title}`
    const filename = titleToFilename(taskTitle)
    const filePath = `${dustPath}/tasks/${filename}`

    const content = `# ${taskTitle}

Research this idea briefly. If confident the implementation is straightforward (clear scope, minimal risk, no open questions), implement directly and commit. Otherwise, create one or more narrowly-scoped task files in \`.dust/tasks/\`. Review \`.dust/principles/\` and \`.dust/facts/\` for relevant context.

## Idea Description

${description}

## Blocked By

(none)

## Definition of Done

- [ ] Idea is implemented directly OR one or more new tasks are created in \`.dust/tasks/\`
- [ ] If tasks were created, they link to relevant principles from \`.dust/principles/\`
- [ ] Changes are committed with a clear commit message
`
    await fileSystem.writeFile(filePath, content)
    return { filePath }
  }

  const taskTitle = `${CAPTURE_IDEA_PREFIX}${title}`
  const filename = titleToFilename(taskTitle)
  const filePath = `${dustPath}/tasks/${filename}`

  const content = `# ${taskTitle}

Research this idea thoroughly, then create one or more idea files in \`.dust/ideas/\`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use \`## Open Questions\` with \`### Question?\` headings and one or more \`#### Option\` headings beneath each question, and only add questions that are meaningful decisions worth asking. Review \`.dust/principles/\` and \`.dust/facts/\` for relevant context.

## Idea Description

${description}

## Blocked By

(none)

## Definition of Done

- [ ] One or more idea files are created in \`.dust/ideas/\`
- [ ] Each idea file has an H1 title matching its content
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
- [ ] Open questions follow the required heading format and focus on high-value decisions
`
  await fileSystem.writeFile(filePath, content)
  return { filePath }
}

export async function parseCaptureIdeaTask(
  fileSystem: ReadableFileSystem,
  dustPath: string,
  taskSlug: string
): Promise<ParsedCaptureIdeaTask | null> {
  const filePath = `${dustPath}/tasks/${taskSlug}.md`
  if (!fileSystem.exists(filePath)) {
    return null
  }

  const content = await fileSystem.readFile(filePath)

  // Verify it's a capture idea task by checking the title
  const titleMatch = content.match(/^#\s+(.+)$/m)
  if (!titleMatch) {
    return null
  }

  const title = titleMatch[1].trim()
  let ideaTitle: string
  let buildItNow: boolean

  if (title.startsWith(BUILD_IDEA_PREFIX)) {
    ideaTitle = title.slice(BUILD_IDEA_PREFIX.length)
    buildItNow = true
  } else if (title.startsWith(CAPTURE_IDEA_PREFIX)) {
    ideaTitle = title.slice(CAPTURE_IDEA_PREFIX.length)
    buildItNow = false
  } else {
    return null
  }

  // Extract the Idea Description section
  const descriptionMatch = content.match(
    /^## Idea Description\n\n([\s\S]*?)\n\n## /m
  )
  if (!descriptionMatch) {
    return null
  }

  const ideaDescription = descriptionMatch[1]

  return { ideaTitle, ideaDescription, buildItNow }
}

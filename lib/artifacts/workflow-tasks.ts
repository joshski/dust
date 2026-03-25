import type { FileSystem, ReadableFileSystem } from '../filesystem/types'
import { MARKDOWN_LINK_PATTERN } from '../markdown/markdown-utilities'

export const IDEA_TRANSITION_PREFIXES = [
  'Refine Idea: ',
  'Decompose Idea: ',
  'Shelve Idea: ',
  'Expedite Idea: ',
]

export const CAPTURE_IDEA_PREFIX = 'Add Idea: '
export const EXPEDITE_IDEA_PREFIX = 'Expedite Idea: '

export interface IdeaInProgress {
  taskSlug: string
  ideaTitle: string
}

export interface ParsedCaptureIdeaTask {
  ideaTitle: string
  ideaDescription: string
  expedite: boolean
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

export const VALID_TASK_TYPES = [
  'implement',
  'capture',
  'refine',
  'decompose',
  'shelve',
] as const

export type TaskType = (typeof VALID_TASK_TYPES)[number]

/**
 * Extracts and validates the task type from the ## Task Type section.
 * Returns the task type if found and valid, null otherwise.
 */
export function parseTaskType(content: string): TaskType | null {
  const lines = content.split('\n')
  let inSection = false
  let inCodeFence = false

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeFence = !inCodeFence
      continue
    }

    if (inCodeFence) continue

    if (line.startsWith('## ')) {
      inSection = line.trimEnd() === '## Task Type'
      continue
    }

    if (!inSection) continue

    if (line.startsWith('# ')) break

    const trimmed = line.trim()
    if (trimmed && VALID_TASK_TYPES.includes(trimmed as TaskType)) {
      return trimmed as TaskType
    }
  }

  return null
}

const WORKFLOW_HINT_PATHS: Record<TaskType, string> = {
  refine: 'config/hints/refine-idea.md',
  decompose: 'config/hints/decompose-idea.md',
  shelve: 'config/hints/shelve-idea.md',
  capture: 'config/hints/add-idea.md',
  implement: 'config/hints/expedite-idea.md',
}

async function readWorkflowHint(
  fileSystem: ReadableFileSystem,
  dustPath: string,
  taskType: TaskType
): Promise<string | null> {
  const hintPath = `${dustPath}/${WORKFLOW_HINT_PATHS[taskType]}`
  if (!fileSystem.exists(hintPath)) {
    return null
  }
  return fileSystem.readFile(hintPath)
}

export interface WorkflowTaskMatch {
  type: TaskType
  ideaSlug: string
  taskSlug: string
  resolvedQuestions: OpenQuestionResponse[]
}

const WORKFLOW_SECTION_HEADINGS: { type: TaskType; heading: string }[] = [
  { type: 'refine', heading: 'Refines Idea' },
  { type: 'decompose', heading: 'Decomposes Idea' },
  { type: 'shelve', heading: 'Shelves Idea' },
  { type: 'implement', heading: 'Expedites Idea' },
]

function extractIdeaSlugFromSection(
  content: string,
  sectionHeading: string
): string | null {
  const lines = content.split('\n')
  let inSection = false
  let inCodeFence = false

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeFence = !inCodeFence
      continue
    }

    if (inCodeFence) continue

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

export interface AllWorkflowTasks {
  captureIdeaTasks: IdeaInProgress[]
  workflowTasksByIdeaSlug: Map<string, WorkflowTaskMatch>
}

export async function findAllWorkflowTasks(
  fileSystem: ReadableFileSystem,
  dustPath: string
): Promise<AllWorkflowTasks> {
  const tasksPath = `${dustPath}/tasks`
  const captureIdeaTasks: IdeaInProgress[] = []
  const workflowTasksByIdeaSlug = new Map<string, WorkflowTaskMatch>()

  if (!fileSystem.exists(tasksPath)) {
    return { captureIdeaTasks, workflowTasksByIdeaSlug }
  }

  const files = await fileSystem.readdir(tasksPath)

  for (const file of files.filter(f => f.endsWith('.md')).toSorted()) {
    const content = await fileSystem.readFile(`${tasksPath}/${file}`)
    const titleMatch = content.match(/^#\s+(.+)$/m)
    if (!titleMatch) continue

    const title = titleMatch[1].trim()
    const taskSlug = file.replace(/\.md$/, '')
    const taskType = parseTaskType(content)

    // Check for capture idea tasks using task type
    if (taskType === 'capture' || taskType === 'implement') {
      // Extract idea title from task title by removing prefix
      let ideaTitle: string | null = null
      if (title.startsWith(CAPTURE_IDEA_PREFIX)) {
        ideaTitle = title.slice(CAPTURE_IDEA_PREFIX.length)
      } else if (title.startsWith(EXPEDITE_IDEA_PREFIX)) {
        ideaTitle = title.slice(EXPEDITE_IDEA_PREFIX.length)
      }

      if (ideaTitle) {
        captureIdeaTasks.push({
          taskSlug,
          ideaTitle,
        })
      }
    } else if (!taskType) {
      // Backward compatibility: fall back to title prefix detection
      if (title.startsWith(CAPTURE_IDEA_PREFIX)) {
        captureIdeaTasks.push({
          taskSlug,
          ideaTitle: title.slice(CAPTURE_IDEA_PREFIX.length),
        })
      } else if (title.startsWith(EXPEDITE_IDEA_PREFIX)) {
        captureIdeaTasks.push({
          taskSlug,
          ideaTitle: title.slice(EXPEDITE_IDEA_PREFIX.length),
        })
      }
    }

    // Check for workflow task linking to an idea
    if (taskType) {
      const heading = WORKFLOW_SECTION_HEADINGS.find(
        h => h.type === taskType
      )?.heading
      if (heading) {
        const linkedSlug = extractIdeaSlugFromSection(content, heading)
        if (linkedSlug) {
          workflowTasksByIdeaSlug.set(linkedSlug, {
            type: taskType,
            ideaSlug: linkedSlug,
            taskSlug,
            resolvedQuestions: parseResolvedQuestions(content),
          })
        }
      }
    } else {
      // Backward compatibility: fall back to section-based detection
      for (const { type, heading } of WORKFLOW_SECTION_HEADINGS) {
        const linkedSlug = extractIdeaSlugFromSection(content, heading)
        if (linkedSlug) {
          workflowTasksByIdeaSlug.set(linkedSlug, {
            type,
            ideaSlug: linkedSlug,
            taskSlug,
            resolvedQuestions: parseResolvedQuestions(content),
          })
        }
      }
    }
  }

  return { captureIdeaTasks, workflowTasksByIdeaSlug }
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

  for (const file of files.filter(f => f.endsWith('.md')).toSorted()) {
    const content = await fileSystem.readFile(`${tasksPath}/${file}`)
    const taskSlug = file.replace(/\.md$/, '')

    // Try to find a match using either task type or section-based detection
    const match = findWorkflowMatch(content, ideaSlug, taskSlug)
    if (match) {
      return match
    }
  }

  return null
}

function findWorkflowMatch(
  content: string,
  ideaSlug: string,
  taskSlug: string
): WorkflowTaskMatch | null {
  const taskType = parseTaskType(content)

  // Try task type first if available
  if (taskType) {
    const heading = WORKFLOW_SECTION_HEADINGS.find(
      h => h.type === taskType
    )?.heading
    if (heading) {
      const linkedSlug = extractIdeaSlugFromSection(content, heading)
      if (linkedSlug === ideaSlug) {
        return {
          type: taskType,
          ideaSlug,
          taskSlug,
          resolvedQuestions: parseResolvedQuestions(content),
        }
      }
    }
  }

  // Fall back to section-based detection for backward compatibility
  for (const { type, heading } of WORKFLOW_SECTION_HEADINGS) {
    const linkedSlug = extractIdeaSlugFromSection(content, heading)
    if (linkedSlug === ideaSlug) {
      return {
        type,
        ideaSlug,
        taskSlug,
        resolvedQuestions: parseResolvedQuestions(content),
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

export function parseResolvedQuestions(
  content: string
): OpenQuestionResponse[] {
  const lines = content.split('\n')
  const results: OpenQuestionResponse[] = []
  let inSection = false
  let currentQuestion: string | null = null

  let inCodeFence = false

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeFence = !inCodeFence
      continue
    }

    if (inCodeFence) continue

    if (line.startsWith('## ')) {
      inSection = line.trimEnd() === '## Resolved Questions'
      currentQuestion = null
      continue
    }

    if (!inSection) continue

    if (line.startsWith('# ')) break

    if (line.startsWith('### ')) {
      currentQuestion = line.slice(4).trimEnd()
      continue
    }

    if (currentQuestion !== null) {
      const decisionMatch = line.match(/^\*\*Decision:\*\*\s*(.+)$/)
      if (decisionMatch) {
        results.push({
          question: currentQuestion,
          chosenOption: decisionMatch[1].trimEnd(),
        })
        currentQuestion = null
      }
    }
  }

  return results
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

function renderRepositoryHintsSection(repositoryHint?: string): string {
  if (!repositoryHint) {
    return ''
  }

  return `
## Repository Hints

${repositoryHint}
`
}

function renderTask(
  title: string,
  openingSentence: string,
  definitionOfDone: string[],
  ideaSection: IdeaSection,
  taskType: TaskType,
  options?: {
    description?: string
    resolvedQuestions?: OpenQuestionResponse[]
    repositoryHint?: string
  }
): string {
  const descriptionParagraph =
    options?.description !== undefined ? `\n${options.description}\n` : ''

  const resolvedSection =
    options?.resolvedQuestions && options.resolvedQuestions.length > 0
      ? `\n${renderResolvedQuestions(options.resolvedQuestions)}\n`
      : ''

  const ideaSectionContent = `\n${renderIdeaSection(ideaSection)}\n`
  const repositoryHintsSection = renderRepositoryHintsSection(
    options?.repositoryHint
  )

  return `# ${title}

${openingSentence}
${descriptionParagraph}${resolvedSection}${ideaSectionContent}
## Task Type

${taskType}

## Blocked By

(none)
${repositoryHintsSection}

## Definition of Done

${definitionOfDone.map(item => `- ${item}`).join('\n')}
`
}

async function createIdeaTransitionTask(
  fileSystem: FileSystem,
  dustPath: string,
  taskType: TaskType,
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
  const baseOpeningSentence = openingSentenceTemplate(ideaTitle)

  const hint = await readWorkflowHint(fileSystem, dustPath, taskType)

  const ideaSection = { heading: ideaSectionHeading, ideaTitle, ideaSlug }

  const content = renderTask(
    taskTitle,
    baseOpeningSentence,
    definitionOfDone,
    ideaSection,
    taskType,
    {
      description: taskOptions?.description,
      resolvedQuestions: taskOptions?.resolvedQuestions,
      repositoryHint: hint ?? undefined,
    }
  )
  await fileSystem.writeFile(filePath, content)
  return { filePath }
}

export async function createRefineIdeaTask(
  fileSystem: FileSystem,
  dustPath: string,
  ideaSlug: string,
  description?: string,
  openQuestionResponses?: OpenQuestionResponse[],
  dustCommand?: string
): Promise<CreateIdeaTransitionTaskResult> {
  const cmd = dustCommand ?? 'dust'
  return createIdeaTransitionTask(
    fileSystem,
    dustPath,
    'refine',
    'Refine Idea: ',
    ideaSlug,
    ideaTitle =>
      `Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Run \`${cmd} principles\` for alignment and \`${cmd} facts\` for relevant design decisions. See [${ideaTitle}](../ideas/${ideaSlug}.md). If you add open questions, use \`## Open Questions\` with \`### Question?\` headings and one or more \`#### Option\` headings beneath each question, and only add questions that are meaningful decisions worth asking.`,
    [
      'Idea is thoroughly researched with relevant codebase context',
      'Open questions are added for any ambiguous or underspecified aspects',
      'Open questions follow the required heading format and focus on high-value decisions',
      'Idea file is updated with findings',
    ],
    'Refines Idea',
    {
      description,
      resolvedQuestions: openQuestionResponses,
    }
  )
}

export async function decomposeIdea(
  fileSystem: FileSystem,
  dustPath: string,
  options: DecomposeIdeaOptions,
  dustCommand?: string
): Promise<CreateIdeaTransitionTaskResult> {
  const cmd = dustCommand ?? 'dust'
  return createIdeaTransitionTask(
    fileSystem,
    dustPath,
    'decompose',
    'Decompose Idea: ',
    options.ideaSlug,
    ideaTitle =>
      `Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run \`${cmd} principles\` to link relevant principles and \`${cmd} facts\` for design decisions that should inform the task. See [${ideaTitle}](../ideas/${options.ideaSlug}.md).`,
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
  description?: string,
  _dustCommand?: string
): Promise<CreateIdeaTransitionTaskResult> {
  return createIdeaTransitionTask(
    fileSystem,
    dustPath,
    'shelve',
    'Shelve Idea: ',
    ideaSlug,
    ideaTitle =>
      `Archive this idea and remove it from the active backlog. See [${ideaTitle}](../ideas/${ideaSlug}.md).`,
    ['Idea file is deleted', 'Rationale is recorded in the commit message'],
    'Shelves Idea',
    { description }
  )
}

export async function createExpediteIdeaTask(
  fileSystem: FileSystem,
  dustPath: string,
  ideaSlug: string,
  description?: string,
  dustCommand?: string
): Promise<CreateIdeaTransitionTaskResult> {
  const cmd = dustCommand ?? 'dust'
  return createIdeaTransitionTask(
    fileSystem,
    dustPath,
    'implement',
    'Expedite Idea: ',
    ideaSlug,
    ideaTitle =>
      `Research this idea briefly. If confident the implementation is straightforward (clear scope, minimal risk, no open questions), implement directly and commit. Otherwise, create one or more narrowly-scoped task files in \`.dust/tasks/\`. Run \`${cmd} principles\` and \`${cmd} facts\` for relevant context. See [${ideaTitle}](../ideas/${ideaSlug}.md).`,
    [
      'Idea is implemented directly OR one or more new tasks are created in `.dust/tasks/`',
      'If tasks were created, they link to relevant principles from `.dust/principles/`',
      'Changes are committed with a clear commit message',
    ],
    'Expedites Idea',
    { description }
  )
}

export async function createIdeaTask(
  fileSystem: FileSystem,
  dustPath: string,
  options: {
    title: string
    description: string
    expedite?: boolean
    dustCommand?: string
  }
): Promise<CreateIdeaTransitionTaskResult> {
  const { title, description, expedite, dustCommand } = options
  const cmd = dustCommand ?? 'dust'
  if (!title || !title.trim()) {
    throw new Error('title is required and must not be whitespace-only')
  }
  if (!description || !description.trim()) {
    throw new Error('description is required and must not be whitespace-only')
  }

  if (expedite) {
    const taskTitle = `${EXPEDITE_IDEA_PREFIX}${title}`
    const filename = titleToFilename(taskTitle)
    const filePath = `${dustPath}/tasks/${filename}`
    const baseOpeningSentence = `Research this idea briefly. If confident the implementation is straightforward (clear scope, minimal risk, no open questions), implement directly and commit. Otherwise, create one or more narrowly-scoped task files in \`.dust/tasks/\`. Run \`${cmd} principles\` and \`${cmd} facts\` for relevant context.`
    const hint = await readWorkflowHint(fileSystem, dustPath, 'implement')
    const repositoryHintsSection = renderRepositoryHintsSection(
      hint ?? undefined
    )

    const content = `# ${taskTitle}

${baseOpeningSentence}

## Idea Description

${description}

## Task Type

implement

## Blocked By

(none)
${repositoryHintsSection}

## Definition of Done

- Idea is implemented directly OR one or more new tasks are created in \`.dust/tasks/\`
- If tasks were created, they link to relevant principles from \`.dust/principles/\`
- Changes are committed with a clear commit message
`
    await fileSystem.writeFile(filePath, content)
    return { filePath }
  }

  const taskTitle = `${CAPTURE_IDEA_PREFIX}${title}`
  const filename = titleToFilename(taskTitle)
  const filePath = `${dustPath}/tasks/${filename}`
  const baseOpeningSentence = `Research this idea thoroughly, then create one or more idea files in \`.dust/ideas/\`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. If you add open questions, use \`## Open Questions\` with \`### Question?\` headings and one or more \`#### Option\` headings beneath each question, and only add questions that are meaningful decisions worth asking. Run \`${cmd} principles\` and \`${cmd} facts\` for relevant context.`
  const hint = await readWorkflowHint(fileSystem, dustPath, 'capture')
  const repositoryHintsSection = renderRepositoryHintsSection(hint ?? undefined)

  const content = `# ${taskTitle}

${baseOpeningSentence}

## Idea Description

${description}

## Task Type

capture

## Blocked By

(none)
${repositoryHintsSection}

## Definition of Done

- One or more idea files are created in \`.dust/ideas/\`
- Each idea file has an H1 title matching its content
- Idea includes relevant context from codebase exploration
- Open questions are added for any ambiguous or underspecified aspects
- Open questions follow the required heading format and focus on high-value decisions
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
  const taskType = parseTaskType(content)

  let ideaTitle: string
  let expedite: boolean

  // Use task type if available, fall back to title prefix
  if (taskType === 'implement') {
    expedite = true
    ideaTitle = title.startsWith(EXPEDITE_IDEA_PREFIX)
      ? title.slice(EXPEDITE_IDEA_PREFIX.length)
      : title
  } else if (taskType === 'capture') {
    expedite = false
    ideaTitle = title.startsWith(CAPTURE_IDEA_PREFIX)
      ? title.slice(CAPTURE_IDEA_PREFIX.length)
      : title
  } else if (title.startsWith(EXPEDITE_IDEA_PREFIX)) {
    // Backward compatibility: fall back to title prefix
    ideaTitle = title.slice(EXPEDITE_IDEA_PREFIX.length)
    expedite = true
  } else if (title.startsWith(CAPTURE_IDEA_PREFIX)) {
    // Backward compatibility: fall back to title prefix
    ideaTitle = title.slice(CAPTURE_IDEA_PREFIX.length)
    expedite = false
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

  return { ideaTitle, ideaDescription, expedite }
}

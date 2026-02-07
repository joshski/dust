import type { FileSystem } from './cli/types'

export const IDEA_TRANSITION_PREFIXES = [
  'Refine Idea: ',
  'Create Task From Idea: ',
  'Shelve Idea: ',
]

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

export interface CreateIdeaTransitionTaskResult {
  filePath: string
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

function renderTask(
  title: string,
  openingSentence: string,
  definitionOfDone: string[],
  description?: string
): string {
  const descriptionParagraph =
    description !== undefined ? `\n${description}\n` : ''

  return `# ${title}

${openingSentence}
${descriptionParagraph}
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
  description?: string
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
    description
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
      `Research and refine this idea into a well-defined proposal. See [${ideaTitle}](../ideas/${ideaSlug}.md).`,
    [
      'Open questions are identified and resolved',
      'Idea file is updated with findings',
    ],
    description
  )
}

export async function createTaskFromIdea(
  fileSystem: FileSystem,
  dustPath: string,
  ideaSlug: string,
  description?: string
): Promise<CreateIdeaTransitionTaskResult> {
  return createIdeaTask(
    fileSystem,
    dustPath,
    'Create Task From Idea: ',
    ideaSlug,
    ideaTitle =>
      `Create a well-defined task from this idea. See [${ideaTitle}](../ideas/${ideaSlug}.md).`,
    [
      'A new task is created in .dust/tasks/',
      'The original idea is deleted or updated to reflect remaining scope',
    ],
    description
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
    description
  )
}

export async function createCaptureIdeaTask(
  fileSystem: FileSystem,
  dustPath: string,
  description: string
): Promise<CreateIdeaTransitionTaskResult> {
  if (!description || !description.trim()) {
    throw new Error('description is required and must not be whitespace-only')
  }

  const taskTitle = 'Capture Idea'
  const filename = titleToFilename(taskTitle)
  const filePath = `${dustPath}/tasks/${filename}`

  const content = renderTask(
    taskTitle,
    'Research and capture a new idea in the dust backlog.',
    [
      'A new idea file is created in .dust/ideas/',
      'Idea has a clear title and description',
    ],
    description
  )
  await fileSystem.writeFile(filePath, content)
  return { filePath }
}

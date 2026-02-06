/**
 * Browser-compatible API for creating idea transition tasks.
 *
 * This module has no Node.js built-in dependencies and can be used
 * in browser environments with a pluggable FileSystem implementation.
 */

import type { FileSystem } from '../cli/types'

export type { FileSystem }

export const IDEA_TRANSITION_PREFIXES = [
  'Refine Idea: ',
  'Create Task From Idea: ',
  'Shelve Idea: ',
]

const TRANSITION_PREFIX_MAP: Record<
  CreateIdeaTransitionTaskInput['transition'],
  string
> = {
  'refine-idea': 'Refine Idea: ',
  'create-task-from-idea': 'Create Task From Idea: ',
  'shelve-idea': 'Shelve Idea: ',
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

export interface CreateIdeaTransitionTaskInput {
  transition: 'refine-idea' | 'create-task-from-idea' | 'shelve-idea'
  ideaSlug: string
  openingSentence: string
  goals: string[]
  blockedBy: string[]
  definitionOfDone: string[]
}

export interface CreateIdeaTransitionTaskResult {
  filePath: string
}

export async function createIdeaTransitionTask(
  fileSystem: FileSystem,
  dustPath: string,
  input: CreateIdeaTransitionTaskInput
): Promise<CreateIdeaTransitionTaskResult> {
  const ideaPath = `${dustPath}/ideas/${input.ideaSlug}.md`
  if (!fileSystem.exists(ideaPath)) {
    throw new Error(
      `Idea not found: "${input.ideaSlug}" (expected file at ${ideaPath})`
    )
  }

  const ideaContent = await fileSystem.readFile(ideaPath)
  const ideaTitleMatch = ideaContent.match(/^#\s+(.+)$/m)
  if (!ideaTitleMatch) {
    throw new Error(`Idea file has no title: ${ideaPath}`)
  }
  const ideaTitle = ideaTitleMatch[1].trim()

  const prefix = TRANSITION_PREFIX_MAP[input.transition]
  const taskTitle = `${prefix}${ideaTitle}`
  const filename = titleToFilename(taskTitle)
  const filePath = `${dustPath}/tasks/${filename}`

  const goalsSection =
    input.goals.length > 0
      ? input.goals.map(slug => `- [${slug}](../goals/${slug}.md)`).join('\n')
      : '(none)'

  const blockedBySection =
    input.blockedBy.length > 0
      ? input.blockedBy
          .map(slug => `- [${slug}](../tasks/${slug}.md)`)
          .join('\n')
      : '(none)'

  const definitionOfDoneSection = input.definitionOfDone
    .map(item => `- [ ] ${item}`)
    .join('\n')

  const content = `# ${taskTitle}

${input.openingSentence}

## Goals

${goalsSection}

## Blocked By

${blockedBySection}

## Definition of Done

${definitionOfDoneSection}
`

  await fileSystem.writeFile(filePath, content)

  return { filePath }
}

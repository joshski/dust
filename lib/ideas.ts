import type { ReadableFileSystem } from './cli/types'
import {
  extractOpeningSentence,
  extractTitle,
} from './markdown/markdown-utilities'

export interface IdeaOption {
  name: string
  description: string
}

export interface IdeaOpenQuestion {
  question: string
  options: IdeaOption[]
}

export interface Idea {
  slug: string
  title: string
  openingSentence: string | null
  content: string
  openQuestions: IdeaOpenQuestion[]
}

/**
 * Parses the ## Open Questions section from idea markdown content.
 * Extracts each ### question heading and its #### option children.
 */
export function parseOpenQuestions(content: string): IdeaOpenQuestion[] {
  const lines = content.split('\n')
  const questions: IdeaOpenQuestion[] = []

  let inOpenQuestions = false
  let currentQuestion: IdeaOpenQuestion | null = null
  let currentOption: IdeaOption | null = null
  let descriptionLines: string[] = []

  function flushOption() {
    if (currentOption) {
      currentOption.description = descriptionLines.join('\n').trim()
      descriptionLines = []
      currentOption = null
    }
  }

  function flushQuestion() {
    flushOption()
    if (currentQuestion) {
      questions.push(currentQuestion)
      currentQuestion = null
    }
  }

  for (const line of lines) {
    // h2 heading: enters or exits the Open Questions section
    if (line.startsWith('## ')) {
      if (inOpenQuestions) {
        flushQuestion()
      }
      inOpenQuestions = line.trimEnd() === '## Open Questions'
      continue
    }

    if (!inOpenQuestions) continue

    // h3 heading: a question
    if (line.startsWith('### ')) {
      flushQuestion()
      currentQuestion = {
        question: line.slice(4).trim(),
        options: [],
      }
      continue
    }

    // h4 heading: an option
    if (line.startsWith('#### ')) {
      flushOption()
      currentOption = {
        name: line.slice(5).trim(),
        description: '',
      }
      if (currentQuestion) {
        currentQuestion.options.push(currentOption)
      }
      continue
    }

    // Content lines go to the current option's description
    if (currentOption) {
      descriptionLines.push(line)
    }
  }

  // Flush anything remaining
  flushQuestion()

  return questions
}

/**
 * Parses an idea markdown file into a structured Idea object.
 */
export async function parseIdea(
  fileSystem: ReadableFileSystem,
  dustPath: string,
  slug: string
): Promise<Idea> {
  const ideaPath = `${dustPath}/ideas/${slug}.md`
  if (!fileSystem.exists(ideaPath)) {
    throw new Error(`Idea not found: "${slug}" (expected file at ${ideaPath})`)
  }

  const content = await fileSystem.readFile(ideaPath)
  const title = extractTitle(content)
  if (!title) {
    throw new Error(`Idea file has no title: ${ideaPath}`)
  }

  const openingSentence = extractOpeningSentence(content)
  const openQuestions = parseOpenQuestions(content)

  return {
    slug,
    title,
    openingSentence,
    content,
    openQuestions,
  }
}

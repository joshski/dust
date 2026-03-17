import type { ReadableFileSystem } from '../filesystem/types'
import {
  extractOpeningSentence,
  extractTitle,
} from '../markdown/markdown-utilities'

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

export interface ParsedIdeaContent {
  title: string | null
  body: string
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

  let inCodeFence = false

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeFence = !inCodeFence
      if (currentOption) {
        descriptionLines.push(line)
      }
      continue
    }

    if (inCodeFence) {
      if (currentOption) {
        descriptionLines.push(line)
      }
      continue
    }

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

/**
 * Strips the ## Open Questions section from idea markdown content.
 * Preserves all content before and after the section.
 */
function stripOpenQuestionsSection(content: string): string {
  const lines = content.split('\n')
  const result: string[] = []
  let inOpenQuestions = false
  let inCodeFence = false

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeFence = !inCodeFence
      if (!inOpenQuestions) result.push(line)
      continue
    }

    if (inCodeFence) {
      if (!inOpenQuestions) result.push(line)
      continue
    }

    if (line.startsWith('## ')) {
      inOpenQuestions = line.trimEnd() === '## Open Questions'
      if (!inOpenQuestions) result.push(line)
      continue
    }

    if (!inOpenQuestions) {
      result.push(line)
    }
  }

  // Trim trailing blank lines
  while (result.length > 0 && result[result.length - 1]!.trim() === '') {
    result.pop()
  }

  return result.join('\n') + '\n'
}

/**
 * Strips the # title line from markdown content.
 */
function stripTitle(content: string): string {
  const match = content.match(/^#\s+.+\n+/)
  if (!match) return content
  return content.slice(match[0].length)
}

/**
 * Parses idea markdown into a structured object that can be bound to a UI
 * and serialized back to markdown.
 */
export function parseIdeaContent(markdown: string): ParsedIdeaContent {
  const title = extractTitle(markdown)
  const openQuestions = parseOpenQuestions(markdown)
  const body = stripTitle(stripOpenQuestionsSection(markdown))

  return { title, body, openQuestions }
}

/**
 * Serializes a ParsedIdeaContent back to markdown.
 * Open Questions are appended as the last section.
 */
export function ideaContentToMarkdown(
  content: ParsedIdeaContent,
  options?: { includeOpenQuestions?: boolean }
): string {
  const includeOQ = options?.includeOpenQuestions ?? true
  const parts: string[] = []

  if (content.title) {
    parts.push(`# ${content.title}`)
    parts.push('')
  }

  if (content.body) {
    parts.push(content.body.trimEnd())
    parts.push('')
  }

  if (includeOQ && content.openQuestions.length > 0) {
    parts.push('## Open Questions')
    parts.push('')

    for (const q of content.openQuestions) {
      parts.push(`### ${q.question}`)
      parts.push('')
      for (const o of q.options) {
        parts.push(`#### ${o.name}`)
        parts.push('')
        if (o.description) {
          parts.push(o.description)
          parts.push('')
        }
      }
    }
  }

  return parts.join('\n')
}

/**
 * Idea serialization and patch building functions.
 */

export interface IdeaOpenQuestion {
  question: string
  options: Array<{
    name: string
    description: string
  }>
}

export interface IdeaInput {
  title: string
  body?: string
  openQuestions?: IdeaOpenQuestion[]
}

function renderOpenQuestionsSection(openQuestions: IdeaOpenQuestion[]): string {
  const parts: string[] = ['## Open Questions', '']

  for (const q of openQuestions) {
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

  return parts.join('\n')
}

/**
 * Serializes an IdeaInput object to markdown format.
 */
export function serializeIdea(input: IdeaInput): string {
  const parts: string[] = []

  parts.push(`# ${input.title}`)
  parts.push('')

  if (input.body) {
    parts.push(input.body.trimEnd())
    parts.push('')
  }

  if (input.openQuestions && input.openQuestions.length > 0) {
    parts.push(renderOpenQuestionsSection(input.openQuestions))
  }

  return parts.join('\n')
}

/**
 * Builds file entries for an idea artifact patch.
 */
export function buildIdeaFiles(
  input: IdeaInput,
  slug: string
): Record<string, string> {
  const content = serializeIdea(input)
  return {
    [`ideas/${slug}.md`]: content,
  }
}

/**
 * Fact serialization and patch building functions.
 */

export interface FactInput {
  title: string
  body: string
}

/**
 * Serializes a FactInput object to markdown format.
 */
export function serializeFact(input: FactInput): string {
  return `# ${input.title}\n\n${input.body}\n`
}

/**
 * Builds file entries for a fact artifact patch.
 */
export function buildFactFiles(
  input: FactInput,
  slug: string
): Record<string, string> {
  const content = serializeFact(input)
  return {
    [`facts/${slug}.md`]: content,
  }
}

import type { ReadableFileSystem } from './cli/types'
import { extractTitle } from './markdown/markdown-utilities'

export interface Fact {
  slug: string
  title: string
  content: string
}

/**
 * Parses a fact markdown file into a structured Fact object.
 */
export async function parseFact(
  fileSystem: ReadableFileSystem,
  dustPath: string,
  slug: string
): Promise<Fact> {
  const factPath = `${dustPath}/facts/${slug}.md`
  if (!fileSystem.exists(factPath)) {
    throw new Error(`Fact not found: "${slug}" (expected file at ${factPath})`)
  }

  const content = await fileSystem.readFile(factPath)
  const title = extractTitle(content)
  if (!title) {
    throw new Error(`Fact file has no title: ${factPath}`)
  }

  return {
    slug,
    title,
    content,
  }
}

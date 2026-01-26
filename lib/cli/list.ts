/**
 * dust list [type] - List tasks, ideas, goals, or facts
 */

import type { CommandContext, CommandResult, FileSystem } from './types'

const VALID_TYPES = ['tasks', 'ideas', 'goals', 'facts'] as const
type ListType = (typeof VALID_TYPES)[number]

function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

export async function list(
  ctx: CommandContext,
  fs: FileSystem,
  args: string[]
): Promise<CommandResult> {
  const dustPath = `${ctx.cwd}/.dust`

  if (!fs.exists(dustPath)) {
    ctx.stderr('Error: .dust directory not found')
    ctx.stderr("Run 'dust init' to initialize a Dust repository")
    return { exitCode: 1 }
  }

  const typesToList: ListType[] =
    args.length === 0
      ? [...VALID_TYPES]
      : (args.filter(a => VALID_TYPES.includes(a as ListType)) as ListType[])

  if (args.length > 0 && typesToList.length === 0) {
    ctx.stderr(`Invalid type: ${args[0]}`)
    ctx.stderr(`Valid types: ${VALID_TYPES.join(', ')}`)
    return { exitCode: 1 }
  }

  for (const type of typesToList) {
    const dirPath = `${dustPath}/${type}`

    if (!fs.exists(dirPath)) {
      continue
    }

    const files = await fs.readdir(dirPath)
    const mdFiles = files.filter(f => f.endsWith('.md')).sort()

    if (mdFiles.length === 0) {
      continue
    }

    ctx.stdout(`${type}:`)

    for (const file of mdFiles) {
      const filePath = `${dirPath}/${file}`
      const content = await fs.readFile(filePath)
      const title = extractTitle(content)
      const name = file.replace(/\.md$/, '')

      if (title) {
        ctx.stdout(`  ${name} - ${title}`)
      } else {
        ctx.stdout(`  ${name}`)
      }
    }

    ctx.stdout('')
  }

  return { exitCode: 0 }
}

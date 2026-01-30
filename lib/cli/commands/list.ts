/**
 * dust list [type] - List tasks, ideas, goals, or facts
 */

import { extractOpeningSentence } from '../markdown-utilities'
import type { CommandDependencies, CommandResult } from '../types'

const VALID_TYPES = ['tasks', 'ideas', 'goals', 'facts'] as const
type ListType = (typeof VALID_TYPES)[number]

export async function list(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { arguments: commandArguments, context, fileSystem } = dependencies
  const dustPath = `${context.cwd}/.dust`

  if (!fileSystem.exists(dustPath)) {
    context.stderr('Error: .dust directory not found')
    context.stderr("Run 'dust init' to initialize a Dust repository")
    return { exitCode: 1 }
  }

  const typesToList: ListType[] =
    commandArguments.length === 0
      ? [...VALID_TYPES]
      : (commandArguments.filter(a =>
          VALID_TYPES.includes(a as ListType)
        ) as ListType[])

  if (commandArguments.length > 0 && typesToList.length === 0) {
    context.stderr(`Invalid type: ${commandArguments[0]}`)
    context.stderr(`Valid types: ${VALID_TYPES.join(', ')}`)
    return { exitCode: 1 }
  }

  for (const type of typesToList) {
    const dirPath = `${dustPath}/${type}`

    if (!fileSystem.exists(dirPath)) {
      continue
    }

    const files = await fileSystem.readdir(dirPath)
    const mdFiles = files.filter(f => f.endsWith('.md')).sort()

    if (mdFiles.length === 0) {
      continue
    }

    context.stdout(`${type}:`)

    for (const file of mdFiles) {
      const filePath = `${dirPath}/${file}`
      const content = await fileSystem.readFile(filePath)
      const openingSentence = extractOpeningSentence(content)
      const relativePath = `.dust/${type}/${file}`

      if (openingSentence) {
        context.stdout(`  ${relativePath} - ${openingSentence}`)
      } else {
        context.stdout(`  ${relativePath}`)
      }
    }

    context.stdout('')
  }

  return { exitCode: 0 }
}

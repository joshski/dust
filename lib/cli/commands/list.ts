/**
 * dust list [type] - List tasks, ideas, goals, or facts
 */

import { extractOpeningSentence, extractTitle } from '../markdown-utilities'
import type { CommandDependencies, CommandResult } from '../types'

const VALID_TYPES = ['tasks', 'ideas', 'goals', 'facts'] as const
type ListType = (typeof VALID_TYPES)[number]

const SECTION_HEADERS: Record<ListType, string> = {
  tasks: '📋 Tasks',
  ideas: '💡 Ideas',
  goals: '🎯 Goals',
  facts: '📄 Facts',
}

const TYPE_EXPLANATIONS: Record<ListType, string> = {
  tasks:
    'Tasks are detailed work plans with dependencies and completion criteria. Each task describes a specific piece of work to be done.',
  ideas:
    "Ideas are future feature notes and proposals. Ideas capture possibilities that haven't yet been refined into actionable tasks.",
  goals:
    'Goals are mission statements and guiding principles. Goals describe desired outcomes and values that inform decision-making.',
  facts:
    'Facts are current state documentation. Facts capture how things work today, providing context for agents and contributors.',
}

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
}

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

  const specificTypeRequested = commandArguments.length > 0

  for (const type of typesToList) {
    const dirPath = `${dustPath}/${type}`

    const dirExists = fileSystem.exists(dirPath)
    const files = dirExists ? await fileSystem.readdir(dirPath) : []
    const mdFiles = files.filter(f => f.endsWith('.md')).sort()

    if (mdFiles.length === 0) {
      if (specificTypeRequested) {
        context.stdout(SECTION_HEADERS[type])
        context.stdout('')
        context.stdout(TYPE_EXPLANATIONS[type])
        context.stdout('')
        context.stdout(`No ${type} found.`)
        context.stdout('')
      }
      continue
    }

    context.stdout(SECTION_HEADERS[type])
    context.stdout('')
    context.stdout(TYPE_EXPLANATIONS[type])
    context.stdout('')

    for (const file of mdFiles) {
      const filePath = `${dirPath}/${file}`
      const content = await fileSystem.readFile(filePath)
      const title = extractTitle(content)
      const openingSentence = extractOpeningSentence(content)
      const relativePath = `.dust/${type}/${file}`

      if (title) {
        context.stdout(`${colors.bold}# ${title}${colors.reset}`)
      } else {
        context.stdout(
          `${colors.bold}# ${file.replace('.md', '')}${colors.reset}`
        )
      }

      if (openingSentence) {
        context.stdout(`${colors.dim}${openingSentence}${colors.reset}`)
      }

      context.stdout(`${colors.cyan}→ ${relativePath}${colors.reset}`)
      context.stdout('')
    }
  }

  return { exitCode: 0 }
}

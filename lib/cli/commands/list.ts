/**
 * dust [type] - List tasks, ideas, principles, or facts (e.g., dust tasks, dust principles)
 */

import { basename } from 'node:path'
import {
  extractPrincipleRelationships,
  type PrincipleRelationships,
} from '../../lint/validators/principle-hierarchy'
import {
  extractOpeningSentence,
  extractTitle,
} from '../../markdown/markdown-utilities'
import { getColors } from '../colors'
import type { CommandDependencies, CommandResult, FileSystem } from '../types'

const VALID_TYPES = ['tasks', 'ideas', 'principles', 'facts'] as const
type ListType = (typeof VALID_TYPES)[number]

const SECTION_HEADERS: Record<ListType, string> = {
  tasks: '📋 Tasks',
  ideas: '💡 Ideas',
  principles: '🎯 Principles',
  facts: '📄 Facts',
}

const TYPE_EXPLANATIONS: Record<ListType, string> = {
  tasks:
    'Tasks are detailed work plans with dependencies and completion criteria. Each task describes a specific piece of work to be done.',
  ideas:
    "Ideas are future feature notes and proposals. Ideas capture possibilities that haven't yet been refined into actionable tasks.",
  principles:
    'Principles are guiding values and design constraints. Principles describe how decisions should be made and what matters most.',
  facts:
    'Facts are current state documentation. Facts capture how things work today, providing context for agents and contributors.',
}

interface PrincipleNode {
  filePath: string
  title: string
  children: PrincipleNode[]
}

async function buildPrincipleHierarchy(
  principlesPath: string,
  fileSystem: FileSystem
): Promise<PrincipleNode[]> {
  const files = await fileSystem.readdir(principlesPath)
  const mdFiles = files.filter(f => f.endsWith('.md'))

  // Build relationships for all principles
  const relationships: PrincipleRelationships[] = []
  const titleMap = new Map<string, string>()

  for (const file of mdFiles) {
    const filePath = `${principlesPath}/${file}`
    const content = await fileSystem.readFile(filePath)
    relationships.push(extractPrincipleRelationships(filePath, content))
    const title = extractTitle(content) || basename(file, '.md')
    titleMap.set(filePath, title)
  }

  // Build a map of filePath -> PrincipleRelationships
  const relMap = new Map<string, PrincipleRelationships>()
  for (const rel of relationships) {
    relMap.set(rel.filePath, rel)
  }

  // Find root principles (those with no parent or "(none)" parent)
  const rootPrinciples = relationships.filter(
    rel => rel.parentPrinciples.length === 0
  )

  // Recursively build the tree
  function buildNode(filePath: string): PrincipleNode {
    const rel = relMap.get(filePath)
    const children: PrincipleNode[] = []

    if (rel) {
      for (const childPath of rel.subPrinciples) {
        children.push(buildNode(childPath))
      }
    }

    return {
      filePath,
      title: titleMap.get(filePath) || basename(filePath, '.md'),
      children,
    }
  }

  return rootPrinciples.map(rel => buildNode(rel.filePath))
}

function renderHierarchy(
  nodes: PrincipleNode[],
  output: (line: string) => void,
  prefix = ''
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const isLastNode = i === nodes.length - 1
    const connector = isLastNode ? '└── ' : '├── '
    const childPrefix = isLastNode ? '    ' : '│   '

    output(`${prefix}${connector}${node.title}`)

    if (node.children.length > 0) {
      renderHierarchy(node.children, output, prefix + childPrefix)
    }
  }
}

export async function list(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { arguments: commandArguments, context, fileSystem } = dependencies
  const dustPath = `${context.cwd}/.dust`
  const colors = getColors()

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

    // Show principle hierarchy above the flat list
    if (type === 'principles') {
      const hierarchy = await buildPrincipleHierarchy(dirPath, fileSystem)
      if (hierarchy.length > 0) {
        context.stdout(`${colors.dim}Hierarchy:${colors.reset}`)
        renderHierarchy(hierarchy, line => context.stdout(line))
        context.stdout('')
      }
    }

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

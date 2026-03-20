/**
 * dust [type] - List tasks, ideas, principles, or facts (e.g., dust tasks, dust principles)
 */

import { basename } from 'node:path'
import { ARTIFACT_TYPES } from '../../artifacts/index'
import {
  getCorePrincipleHierarchy,
  type CorePrincipleNode,
} from '../../core-principles'
import { parseArtifact } from '../../artifacts/parsed-artifact'
import { findAllWorkflowTasks } from '../../artifacts/workflow-tasks'
import {
  extractPrincipleRelationships,
  type PrincipleRelationships,
} from '../../lint/validators/principle-hierarchy'
import {
  extractOpeningSentence,
  extractTitle,
} from '../../markdown/markdown-utilities'
import { getColors } from '../colors'
import type {
  CommandDependencies,
  CommandResult,
  ReadableFileSystem,
} from '../types'

type IdeaStatus =
  | 'draft'
  | 'refining'
  | 'decomposing'
  | 'shelving'
  | 'expediting'

function workflowTypeToStatus(
  type: 'refine-idea' | 'decompose-idea' | 'shelve-idea' | 'expedite-idea'
): IdeaStatus {
  switch (type) {
    case 'refine-idea':
      return 'refining'
    case 'decompose-idea':
      return 'decomposing'
    case 'shelve-idea':
      return 'shelving'
    case 'expedite-idea':
      return 'expediting'
  }
}

type ListType = (typeof ARTIFACT_TYPES)[number]

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

interface CollectedItem {
  path: string
  title: string
  status?: string
}

type ListEvent =
  | { type: 'facts-listed'; facts: { path: string; title: string }[] }
  | {
      type: 'ideas-listed'
      ideas: { path: string; title: string; status: string }[]
    }
  | {
      type: 'principles-listed'
      principles: { path: string; title: string }[]
    }

type EventEmitter = ((event: ListEvent) => void) | undefined

function emitListEvent(
  emitEvent: (event: ListEvent) => void,
  type: ListType,
  items: CollectedItem[]
): void {
  if (type === 'facts') {
    emitEvent({
      type: 'facts-listed',
      facts: items.map(i => ({ path: i.path, title: i.title })),
    })
    return
  }

  if (type === 'ideas') {
    emitEvent({
      type: 'ideas-listed',
      ideas: items.map(i => ({
        path: i.path,
        title: i.title,
        status: i.status as string,
      })),
    })
    return
  }

  if (type === 'principles') {
    emitEvent({
      type: 'principles-listed',
      principles: items.map(i => ({ path: i.path, title: i.title })),
    })
  }
}

interface PrincipleNode {
  filePath: string
  title: string
  children: PrincipleNode[]
}

async function buildPrincipleHierarchy(
  principlesPath: string,
  fileSystem: ReadableFileSystem
): Promise<PrincipleNode[]> {
  const files = await fileSystem.readdir(principlesPath)
  const mdFiles = files.filter(f => f.endsWith('.md'))

  // Build relationships for all principles
  const relationships: PrincipleRelationships[] = []
  const titleMap = new Map<string, string>()

  for (const file of mdFiles) {
    const filePath = `${principlesPath}/${file}`
    const content = await fileSystem.readFile(filePath)
    const artifact = parseArtifact(filePath, content)
    relationships.push(extractPrincipleRelationships(artifact))
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

function renderCorePrincipleHierarchy(
  nodes: CorePrincipleNode[],
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
      renderCorePrincipleHierarchy(node.children, output, prefix + childPrefix)
    }
  }
}

function parseTypesToList(commandArguments: string[]): ListType[] {
  if (commandArguments.length === 0) {
    return [...ARTIFACT_TYPES]
  }
  return commandArguments.filter(a =>
    ARTIFACT_TYPES.includes(a as ListType)
  ) as ListType[]
}

interface WorkflowTasksMap {
  workflowTasksByIdeaSlug: Map<string, { type: IdeaWorkflowType }>
}

type IdeaWorkflowType =
  | 'refine-idea'
  | 'decompose-idea'
  | 'shelve-idea'
  | 'expedite-idea'

function getIdeaStatus(
  slug: string,
  workflowTasks: WorkflowTasksMap | null
): IdeaStatus {
  const workflowTask = workflowTasks?.workflowTasksByIdeaSlug.get(slug)
  return workflowTask ? workflowTypeToStatus(workflowTask.type) : 'draft'
}

function collectItem(
  type: ListType,
  relativePath: string,
  displayTitle: string,
  slug: string,
  workflowTasks: WorkflowTasksMap | null
): CollectedItem | null {
  if (type === 'ideas') {
    return {
      path: relativePath,
      title: displayTitle,
      status: getIdeaStatus(slug, workflowTasks),
    }
  }
  if (type === 'facts' || type === 'principles') {
    return { path: relativePath, title: displayTitle }
  }
  return null
}

interface OutputArtifactParams {
  title: string | null
  slug: string
  openingSentence: string | null
  relativePath: string
  colors: ReturnType<typeof getColors>
  stdout: (line: string) => void
}

function outputArtifact(parameters: OutputArtifactParams): void {
  const { title, slug, openingSentence, relativePath, colors, stdout } =
    parameters
  const displayTitle = title || slug
  stdout(`${colors.bold}# ${displayTitle}${colors.reset}`)
  if (openingSentence) {
    stdout(`${colors.dim}${openingSentence}${colors.reset}`)
  }
  stdout(`${colors.cyan}→ ${relativePath}${colors.reset}`)
  stdout('')
}

interface ListTypeContext {
  type: ListType
  dirPath: string
  mdFiles: string[]
  colors: ReturnType<typeof getColors>
  fileSystem: ReadableFileSystem
  workflowTasks: WorkflowTasksMap | null
  stdout: (line: string) => void
  emitEvent: EventEmitter
}

async function processListType(context: ListTypeContext): Promise<void> {
  const { type, dirPath, mdFiles, colors, fileSystem, workflowTasks } = context
  const { stdout, emitEvent } = context

  const collectedItems: CollectedItem[] = []

  for (const file of mdFiles) {
    const filePath = `${dirPath}/${file}`
    const content = await fileSystem.readFile(filePath)
    const title = extractTitle(content)
    const openingSentence = extractOpeningSentence(content)
    const relativePath = `.dust/${type}/${file}`
    const slug = file.replace('.md', '')
    const displayTitle = title || slug

    const item = collectItem(
      type,
      relativePath,
      displayTitle,
      slug,
      workflowTasks
    )
    if (item) {
      collectedItems.push(item)
    }

    outputArtifact({
      title,
      slug,
      openingSentence,
      relativePath,
      colors,
      stdout,
    })
  }

  if (emitEvent) {
    emitListEvent(emitEvent, type, collectedItems)
  }
}

interface PrinciplesListContext {
  dustPath: string
  colors: ReturnType<typeof getColors>
  fileSystem: ReadableFileSystem
  stdout: (line: string) => void
  emitEvent: EventEmitter
  excludeCorePrinciples?: string[]
}

async function processPrinciplesList(
  context: PrinciplesListContext
): Promise<boolean> {
  const { dustPath, colors, fileSystem, stdout, emitEvent } = context
  const { excludeCorePrinciples } = context

  // Get core principles hierarchy
  const coreHierarchy = await getCorePrincipleHierarchy({
    excludeCorePrinciples,
  })
  const hasCoreHierarchy = coreHierarchy.length > 0

  // Get local principles
  const localDirPath = `${dustPath}/principles`
  const localDirExists = fileSystem.exists(localDirPath)
  const localFiles = localDirExists
    ? await fileSystem.readdir(localDirPath)
    : []
  const localMdFiles = localFiles.filter(f => f.endsWith('.md')).toSorted()
  const hasLocalPrinciples = localMdFiles.length > 0

  // Build local hierarchy
  let localHierarchy: PrincipleNode[] = []
  if (hasLocalPrinciples) {
    localHierarchy = await buildPrincipleHierarchy(localDirPath, fileSystem)
  }
  const hasLocalHierarchy = localHierarchy.length > 0

  /* v8 ignore start -- core principles always exist in the package */
  // If both are empty, return false to indicate nothing was rendered
  if (!hasCoreHierarchy && !hasLocalPrinciples) {
    return false
  }
  /* v8 ignore stop */

  // Output header
  stdout(SECTION_HEADERS['principles'])
  stdout('')
  stdout(TYPE_EXPLANATIONS['principles'])
  stdout('')

  // Render Core section if there are core principles
  /* v8 ignore start -- core principles always exist in the package */
  if (hasCoreHierarchy) {
    /* v8 ignore stop */
    stdout(`${colors.bold}Core${colors.reset}`)
    renderCorePrincipleHierarchy(coreHierarchy, line => stdout(line))
    stdout('')
  }

  // Render Local section if there are local principles
  if (hasLocalPrinciples) {
    stdout(`${colors.bold}Local${colors.reset}`)
    if (hasLocalHierarchy) {
      renderHierarchy(localHierarchy, line => stdout(line))
      stdout('')
    }

    // Collect items for event emission
    const collectedItems: CollectedItem[] = []
    for (const file of localMdFiles) {
      const filePath = `${localDirPath}/${file}`
      const content = await fileSystem.readFile(filePath)
      const title = extractTitle(content)
      const openingSentence = extractOpeningSentence(content)
      const relativePath = `.dust/principles/${file}`
      const slug = file.replace('.md', '')
      const displayTitle = title || slug

      collectedItems.push({ path: relativePath, title: displayTitle })

      outputArtifact({
        title,
        slug,
        openingSentence,
        relativePath,
        colors,
        stdout,
      })
    }

    if (emitEvent) {
      emitListEvent(emitEvent, 'principles', collectedItems)
    }
  } else if (emitEvent) {
    // Emit empty list if no local principles but we still need to emit
    emitListEvent(emitEvent, 'principles', [])
  }

  return true
}

export async function list(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const {
    arguments: commandArguments,
    context,
    fileSystem,
    settings,
  } = dependencies
  const dustPath = `${context.cwd}/.dust`
  const colors = getColors()

  if (!fileSystem.exists(dustPath)) {
    context.stderr('Error: .dust directory not found')
    context.stderr("Run 'dust init' to initialize a Dust repository")
    return { exitCode: 1 }
  }

  const typesToList = parseTypesToList(commandArguments)

  if (commandArguments.length > 0 && typesToList.length === 0) {
    context.stderr(`Invalid type: ${commandArguments[0]}`)
    context.stderr(`Valid types: ${ARTIFACT_TYPES.join(', ')}`)
    return { exitCode: 1 }
  }

  const specificTypeRequested = commandArguments.length > 0
  const showTaskCreationHint =
    specificTypeRequested &&
    typesToList.length === 1 &&
    typesToList[0] === 'tasks'

  const workflowTasks =
    typesToList.includes('ideas') && fileSystem.exists(dustPath)
      ? await findAllWorkflowTasks(fileSystem, dustPath)
      : null

  for (const type of typesToList) {
    // Handle principles specially with Core and Local sections
    if (type === 'principles') {
      const hasContent = await processPrinciplesList({
        dustPath,
        colors,
        fileSystem,
        stdout: context.stdout,
        emitEvent: context.emitEvent,
        excludeCorePrinciples: settings.excludeCorePrinciples,
      })

      /* v8 ignore start -- core principles always exist in the package */
      if (!hasContent && specificTypeRequested) {
        context.stdout(SECTION_HEADERS[type])
        context.stdout('')
        context.stdout(TYPE_EXPLANATIONS[type])
        context.stdout('')
        context.stdout(`No ${type} found.`)
        context.stdout('')
        if (context.emitEvent) {
          emitListEvent(context.emitEvent, type, [])
        }
      }
      /* v8 ignore stop */
      continue
    }

    const dirPath = `${dustPath}/${type}`
    const dirExists = fileSystem.exists(dirPath)
    const files = dirExists ? await fileSystem.readdir(dirPath) : []
    const mdFiles = files.filter(f => f.endsWith('.md')).toSorted()

    if (mdFiles.length === 0) {
      if (specificTypeRequested) {
        context.stdout(SECTION_HEADERS[type])
        context.stdout('')
        context.stdout(TYPE_EXPLANATIONS[type])
        context.stdout('')
        context.stdout(`No ${type} found.`)
        context.stdout('')
      }
      if (context.emitEvent) {
        emitListEvent(context.emitEvent, type, [])
      }
      continue
    }

    context.stdout(SECTION_HEADERS[type])
    context.stdout('')
    context.stdout(TYPE_EXPLANATIONS[type])
    context.stdout('')

    await processListType({
      type,
      dirPath,
      mdFiles,
      colors,
      fileSystem,
      workflowTasks,
      stdout: context.stdout,
      emitEvent: context.emitEvent,
    })
  }

  if (showTaskCreationHint) {
    context.stdout('➕ Add a New Task')
    context.stdout('')
    context.stdout(`Run \`${settings.dustCommand} new task\``)
  }

  return { exitCode: 0 }
}

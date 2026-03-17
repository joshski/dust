import type { FileSystem, ReadableFileSystem } from '../filesystem/types'
import { type Fact, parseFact as parseFactImpl } from './facts'
import {
  type Idea,
  type IdeaOpenQuestion,
  type IdeaOption,
  type ParsedIdeaContent,
  ideaContentToMarkdown,
  parseIdea as parseIdeaImpl,
  parseIdeaContent,
  parseOpenQuestions,
} from './ideas'
import { extractTitle } from '../markdown/markdown-utilities'
import {
  type Principle,
  parsePrinciple as parsePrincipleImpl,
} from './principles'
import { parseTask as parseTaskImpl, type Task } from './tasks'
import {
  type AllWorkflowTasks,
  CAPTURE_IDEA_PREFIX,
  type CreateIdeaTransitionTaskResult,
  createIdeaTask as createIdeaTaskImpl,
  createExpediteIdeaTask as createExpediteIdeaTaskImpl,
  createRefineIdeaTask as createRefineIdeaTaskImpl,
  createShelveIdeaTask as createShelveIdeaTaskImpl,
  type DecomposeIdeaOptions,
  decomposeIdea as decomposeIdeaImpl,
  findAllWorkflowTasks,
  findWorkflowTaskForIdea as findWorkflowTaskForIdeaImpl,
  type IdeaInProgress,
  type OpenQuestionResponse,
  type ParsedCaptureIdeaTask,
  parseCaptureIdeaTask as parseCaptureIdeaTaskImpl,
  parseResolvedQuestions,
  type WorkflowTaskMatch,
  type WorkflowTaskType,
} from './workflow-tasks'

// Re-export types
export type {
  AllWorkflowTasks,
  CreateIdeaTransitionTaskResult,
  DecomposeIdeaOptions,
  Fact,
  Idea,
  IdeaOpenQuestion,
  IdeaOption,
  OpenQuestionResponse,
  ParsedCaptureIdeaTask,
  ParsedIdeaContent,
  Principle,
  Task,
  WorkflowTaskMatch,
  WorkflowTaskType,
}

export interface TaskGraphNode {
  task: Task
  workflowType: WorkflowTaskType | null
}

export interface TaskGraph {
  nodes: TaskGraphNode[]
  edges: Array<{ from: string; to: string }>
}

// Re-export constants and standalone functions
export {
  CAPTURE_IDEA_PREFIX,
  extractTitle,
  findAllWorkflowTasks,
  ideaContentToMarkdown,
  parseIdeaContent,
  parseOpenQuestions,
  parseResolvedQuestions,
}
export type { IdeaInProgress }

export type ArtifactType = 'ideas' | 'tasks' | 'principles' | 'facts'

export interface ReadOnlyArtifactsRepository {
  artifactPath(type: ArtifactType, slug: string): string
  parseIdea(options: { slug: string }): Promise<Idea>
  listIdeas(): Promise<string[]>
  parsePrinciple(options: { slug: string }): Promise<Principle>
  listPrinciples(): Promise<string[]>
  parseFact(options: { slug: string }): Promise<Fact>
  listFacts(): Promise<string[]>
  parseTask(options: { slug: string }): Promise<Task>
  listTasks(): Promise<string[]>
  findWorkflowTaskForIdea(options: {
    ideaSlug: string
  }): Promise<WorkflowTaskMatch | null>
  parseCaptureIdeaTask(options: {
    taskSlug: string
  }): Promise<ParsedCaptureIdeaTask | null>
  buildTaskGraph(): Promise<TaskGraph>
}

export interface ArtifactsRepository extends ReadOnlyArtifactsRepository {
  createRefineIdeaTask(options: {
    ideaSlug: string
    description?: string
    openQuestionResponses?: OpenQuestionResponse[]
    dustCommand?: string
  }): Promise<CreateIdeaTransitionTaskResult>
  createDecomposeIdeaTask(
    options: DecomposeIdeaOptions & { dustCommand?: string }
  ): Promise<CreateIdeaTransitionTaskResult>
  createShelveIdeaTask(options: {
    ideaSlug: string
    description?: string
    dustCommand?: string
  }): Promise<CreateIdeaTransitionTaskResult>
  createExpediteIdeaTask(options: {
    ideaSlug: string
    description?: string
    dustCommand?: string
  }): Promise<CreateIdeaTransitionTaskResult>
  createIdeaTask(options: {
    title: string
    description: string
    expedite?: boolean
    dustCommand?: string
  }): Promise<CreateIdeaTransitionTaskResult>
}

function buildReadOperations(
  fileSystem: ReadableFileSystem,
  dustPath: string
): ReadOnlyArtifactsRepository {
  return {
    artifactPath(type: ArtifactType, slug: string): string {
      return `${dustPath}/${type}/${slug}.md`
    },

    async parseIdea(options: { slug: string }): Promise<Idea> {
      return parseIdeaImpl(fileSystem, dustPath, options.slug)
    },

    async listIdeas(): Promise<string[]> {
      const ideasPath = `${dustPath}/ideas`
      if (!fileSystem.exists(ideasPath)) {
        return []
      }
      const files = await fileSystem.readdir(ideasPath)
      return files
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace(/\.md$/, ''))
        .toSorted()
    },

    async parsePrinciple(options: { slug: string }): Promise<Principle> {
      return parsePrincipleImpl(fileSystem, dustPath, options.slug)
    },

    async listPrinciples(): Promise<string[]> {
      const principlesPath = `${dustPath}/principles`
      if (!fileSystem.exists(principlesPath)) {
        return []
      }
      const files = await fileSystem.readdir(principlesPath)
      return files
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace(/\.md$/, ''))
        .toSorted()
    },

    async parseFact(options: { slug: string }): Promise<Fact> {
      return parseFactImpl(fileSystem, dustPath, options.slug)
    },

    async listFacts(): Promise<string[]> {
      const factsPath = `${dustPath}/facts`
      if (!fileSystem.exists(factsPath)) {
        return []
      }
      const files = await fileSystem.readdir(factsPath)
      return files
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace(/\.md$/, ''))
        .toSorted()
    },

    async parseTask(options: { slug: string }): Promise<Task> {
      return parseTaskImpl(fileSystem, dustPath, options.slug)
    },

    async listTasks(): Promise<string[]> {
      const tasksPath = `${dustPath}/tasks`
      if (!fileSystem.exists(tasksPath)) {
        return []
      }
      const files = await fileSystem.readdir(tasksPath)
      return files
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace(/\.md$/, ''))
        .toSorted()
    },

    async findWorkflowTaskForIdea(options: {
      ideaSlug: string
    }): Promise<WorkflowTaskMatch | null> {
      return findWorkflowTaskForIdeaImpl(fileSystem, dustPath, options.ideaSlug)
    },

    async parseCaptureIdeaTask(options: {
      taskSlug: string
    }): Promise<ParsedCaptureIdeaTask | null> {
      return parseCaptureIdeaTaskImpl(fileSystem, dustPath, options.taskSlug)
    },

    async buildTaskGraph(): Promise<TaskGraph> {
      const taskSlugs = await this.listTasks()
      const allWorkflowTasks = await findAllWorkflowTasks(fileSystem, dustPath)

      const workflowTypeByTaskSlug = new Map<string, WorkflowTaskType>()
      for (const match of allWorkflowTasks.workflowTasksByIdeaSlug.values()) {
        workflowTypeByTaskSlug.set(match.taskSlug, match.type)
      }

      const nodes: TaskGraphNode[] = []
      const edges: Array<{ from: string; to: string }> = []

      for (const slug of taskSlugs) {
        const task = await this.parseTask({ slug })
        nodes.push({
          task,
          workflowType: workflowTypeByTaskSlug.get(slug) ?? null,
        })

        for (const blockerSlug of task.blockedBy) {
          edges.push({ from: blockerSlug, to: slug })
        }
      }

      return { nodes, edges }
    },
  }
}

export function buildArtifactsRepository(
  fileSystem: FileSystem,
  dustPath: string
): ArtifactsRepository {
  return {
    ...buildReadOperations(fileSystem, dustPath),

    async createRefineIdeaTask(options: {
      ideaSlug: string
      description?: string
      openQuestionResponses?: OpenQuestionResponse[]
      dustCommand?: string
    }): Promise<CreateIdeaTransitionTaskResult> {
      return createRefineIdeaTaskImpl(
        fileSystem,
        dustPath,
        options.ideaSlug,
        options.description,
        options.openQuestionResponses,
        options.dustCommand
      )
    },

    async createDecomposeIdeaTask(
      options: DecomposeIdeaOptions & { dustCommand?: string }
    ): Promise<CreateIdeaTransitionTaskResult> {
      return decomposeIdeaImpl(
        fileSystem,
        dustPath,
        options,
        options.dustCommand
      )
    },

    async createShelveIdeaTask(options: {
      ideaSlug: string
      description?: string
      dustCommand?: string
    }): Promise<CreateIdeaTransitionTaskResult> {
      return createShelveIdeaTaskImpl(
        fileSystem,
        dustPath,
        options.ideaSlug,
        options.description,
        options.dustCommand
      )
    },

    async createExpediteIdeaTask(options: {
      ideaSlug: string
      description?: string
      dustCommand?: string
    }): Promise<CreateIdeaTransitionTaskResult> {
      return createExpediteIdeaTaskImpl(
        fileSystem,
        dustPath,
        options.ideaSlug,
        options.description,
        options.dustCommand
      )
    },

    async createIdeaTask(options: {
      title: string
      description: string
      expedite?: boolean
      dustCommand?: string
    }): Promise<CreateIdeaTransitionTaskResult> {
      return createIdeaTaskImpl(fileSystem, dustPath, options)
    },
  }
}

export function buildReadOnlyArtifactsRepository(
  fileSystem: ReadableFileSystem,
  dustPath: string
): ReadOnlyArtifactsRepository {
  return buildReadOperations(fileSystem, dustPath)
}

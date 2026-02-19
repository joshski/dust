import type { FileSystem, ReadableFileSystem } from '../cli/types'
import { type Fact, parseFact as parseFactImpl } from './facts'
import {
  type Idea,
  type IdeaOpenQuestion,
  type IdeaOption,
  parseIdea as parseIdeaImpl,
  parseOpenQuestions,
} from './ideas'
import {
  type Principle,
  parsePrinciple as parsePrincipleImpl,
} from './principles'
import { parseTask as parseTaskImpl, type Task } from './tasks'
import {
  CAPTURE_IDEA_PREFIX,
  type CreateIdeaTransitionTaskResult,
  createCaptureIdeaTask as createCaptureIdeaTaskImpl,
  createRefineIdeaTask as createRefineIdeaTaskImpl,
  createShelveIdeaTask as createShelveIdeaTaskImpl,
  type DecomposeIdeaOptions,
  decomposeIdea as decomposeIdeaImpl,
  findAllCaptureIdeaTasks,
  findWorkflowTaskForIdea as findWorkflowTaskForIdeaImpl,
  type IdeaInProgress,
  type OpenQuestionResponse,
  type ParsedCaptureIdeaTask,
  parseCaptureIdeaTask as parseCaptureIdeaTaskImpl,
  type WorkflowTaskMatch,
} from './workflow-tasks'

// Re-export types
export type {
  CreateIdeaTransitionTaskResult,
  DecomposeIdeaOptions,
  Fact,
  Idea,
  IdeaOpenQuestion,
  IdeaOption,
  OpenQuestionResponse,
  ParsedCaptureIdeaTask,
  Principle,
  Task,
  WorkflowTaskMatch,
}

// Re-export constants and standalone functions
export { CAPTURE_IDEA_PREFIX, findAllCaptureIdeaTasks, parseOpenQuestions }
export type { IdeaInProgress }

export interface ArtifactsRepository {
  parseIdea(options: { slug: string }): Promise<Idea>
  listIdeas(): Promise<string[]>
  parsePrinciple(options: { slug: string }): Promise<Principle>
  listPrinciples(): Promise<string[]>
  parseFact(options: { slug: string }): Promise<Fact>
  listFacts(): Promise<string[]>
  parseTask(options: { slug: string }): Promise<Task>
  listTasks(): Promise<string[]>
  createRefineIdeaTask(options: {
    ideaSlug: string
    description?: string
  }): Promise<CreateIdeaTransitionTaskResult>
  createDecomposeIdeaTask(
    options: DecomposeIdeaOptions
  ): Promise<CreateIdeaTransitionTaskResult>
  createShelveIdeaTask(options: {
    ideaSlug: string
    description?: string
  }): Promise<CreateIdeaTransitionTaskResult>
  createCaptureIdeaTask(options: {
    title: string
    description: string
    buildItNow?: boolean
  }): Promise<CreateIdeaTransitionTaskResult>
  findWorkflowTaskForIdea(options: {
    ideaSlug: string
  }): Promise<WorkflowTaskMatch | null>
  parseCaptureIdeaTask(options: {
    taskSlug: string
  }): Promise<ParsedCaptureIdeaTask | null>
}

export function buildArtifactsRepository(
  fileSystem: FileSystem,
  dustPath: string
): ArtifactsRepository {
  return {
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
        .sort()
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
        .sort()
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
        .sort()
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
        .sort()
    },

    async createRefineIdeaTask(options: {
      ideaSlug: string
      description?: string
    }): Promise<CreateIdeaTransitionTaskResult> {
      return createRefineIdeaTaskImpl(
        fileSystem,
        dustPath,
        options.ideaSlug,
        options.description
      )
    },

    async createDecomposeIdeaTask(
      options: DecomposeIdeaOptions
    ): Promise<CreateIdeaTransitionTaskResult> {
      return decomposeIdeaImpl(fileSystem, dustPath, options)
    },

    async createShelveIdeaTask(options: {
      ideaSlug: string
      description?: string
    }): Promise<CreateIdeaTransitionTaskResult> {
      return createShelveIdeaTaskImpl(
        fileSystem,
        dustPath,
        options.ideaSlug,
        options.description
      )
    },

    async createCaptureIdeaTask(options: {
      title: string
      description: string
      buildItNow?: boolean
    }): Promise<CreateIdeaTransitionTaskResult> {
      return createCaptureIdeaTaskImpl(fileSystem, dustPath, options)
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
  }
}

// Overload for read-only repository
export function buildReadOnlyArtifactsRepository(
  fileSystem: ReadableFileSystem,
  dustPath: string
): Pick<
  ArtifactsRepository,
  | 'parseIdea'
  | 'listIdeas'
  | 'parsePrinciple'
  | 'listPrinciples'
  | 'parseFact'
  | 'listFacts'
  | 'parseTask'
  | 'listTasks'
  | 'findWorkflowTaskForIdea'
  | 'parseCaptureIdeaTask'
> {
  return {
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
        .sort()
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
        .sort()
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
        .sort()
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
        .sort()
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
  }
}

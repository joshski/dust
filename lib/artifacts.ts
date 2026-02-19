import type { FileSystem, ReadableFileSystem } from './cli/types'
import {
  type Idea,
  type IdeaOpenQuestion,
  type IdeaOption,
  parseIdea as parseIdeaImpl,
  parseOpenQuestions,
} from './ideas'
import {
  type CreateIdeaTransitionTaskResult,
  createCaptureIdeaTask as createCaptureIdeaTaskImpl,
  createRefineIdeaTask as createRefineIdeaTaskImpl,
  createShelveIdeaTask as createShelveIdeaTaskImpl,
  type DecomposeIdeaOptions,
  decomposeIdea as decomposeIdeaImpl,
  findWorkflowTaskForIdea as findWorkflowTaskForIdeaImpl,
  type OpenQuestionResponse,
  type ParsedCaptureIdeaTask,
  parseCaptureIdeaTask as parseCaptureIdeaTaskImpl,
  type WorkflowTaskMatch,
} from './workflow-tasks'

// Re-export types
export type {
  CreateIdeaTransitionTaskResult,
  DecomposeIdeaOptions,
  Idea,
  IdeaOpenQuestion,
  IdeaOption,
  OpenQuestionResponse,
  ParsedCaptureIdeaTask,
  WorkflowTaskMatch,
}

// Re-export parsing utilities that don't need file system
export { parseOpenQuestions }

export interface ArtifactsRepository {
  parseIdea(options: { slug: string }): Promise<Idea>
  listIdeas(): Promise<string[]>
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
  'parseIdea' | 'listIdeas' | 'findWorkflowTaskForIdea' | 'parseCaptureIdeaTask'
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

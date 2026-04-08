import type { Fact } from './facts'
import type { Idea } from './ideas'
import type { Principle } from './principles'
import type { Task } from './tasks'
import type {
  ParsedCaptureIdeaTask,
  TaskType,
  WorkflowTaskMatch,
} from './workflow-tasks'

export type ArtifactType = 'ideas' | 'tasks' | 'principles' | 'facts'

export interface TaskGraphNode {
  task: Task
  workflowType: TaskType | null
}

export interface TaskGraph {
  nodes: TaskGraphNode[]
  edges: Array<{ from: string; to: string }>
}

/**
 * Node in the principle hierarchy tree
 */
export interface RepositoryPrincipleNode {
  slug: string
  title: string
  children: RepositoryPrincipleNode[]
}

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
  getRepositoryPrincipleHierarchy(): Promise<RepositoryPrincipleNode[]>
}

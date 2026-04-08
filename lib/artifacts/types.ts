export type TaskType = 'implement' | 'capture' | 'refine' | 'decompose' | 'shelve'

export interface Fact {
  slug: string
  title: string
  content: string
}

export interface IdeaOption {
  name: string
  description: string
}

export interface IdeaOpenQuestion {
  question: string
  options: IdeaOption[]
}

export interface Idea {
  slug: string
  title: string
  openingSentence: string | null
  content: string
  openQuestions: IdeaOpenQuestion[]
}

export interface Principle {
  slug: string
  title: string
  content: string
  parentPrinciple: string | null
  subPrinciples: string[]
}

export interface Task {
  slug: string
  title: string
  content: string
  principles: string[]
  blockedBy: string[]
  definitionOfDone: string[]
}

export interface OpenQuestionResponse {
  question: string
  chosenOption: string
}

export interface WorkflowTaskMatch {
  type: TaskType
  ideaSlug: string
  taskSlug: string
  resolvedQuestions: OpenQuestionResponse[]
}

export interface ParsedCaptureIdeaTask {
  ideaTitle: string
  ideaDescription: string
  expedite: boolean
}

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

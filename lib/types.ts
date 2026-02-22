/**
 * Public type definitions for downstream consumers of @joshski/dust.
 *
 * Import from '@joshski/dust/types' to get typed bindings for
 * the event protocol, workflow tasks, and idea structures.
 */

// Event protocol (wire format for HTTP loop and WebSocket bucket paths)
export type { AgentSessionEvent, EventMessage } from './agent-events'

// Ideas
export type { Idea, IdeaOpenQuestion, IdeaOption } from './artifacts/ideas'

// Workflow tasks
export type {
  CreateIdeaTransitionTaskResult,
  DecomposeIdeaOptions,
  IdeaInProgress,
  OpenQuestionResponse,
  ParsedCaptureIdeaTask,
  WorkflowTaskMatch,
  WorkflowTaskType,
} from './artifacts/workflow-tasks'

// Bucket repository
export type { Repository } from './bucket/repository'

// Strongly typed loop-only events (never sent over the wire)
export interface LoopWarningEvent {
  type: 'loop.warning'
}

export interface LoopStartedEvent {
  type: 'loop.started'
  maxIterations: number
  agentType?: string
}

export interface LoopSyncingEvent {
  type: 'loop.syncing'
}

export interface LoopSyncSkippedEvent {
  type: 'loop.sync_skipped'
  reason: string
}

export interface LoopCheckingTasksEvent {
  type: 'loop.checking_tasks'
}

export interface LoopNoTasksEvent {
  type: 'loop.no_tasks'
}

export interface LoopTasksFoundEvent {
  type: 'loop.tasks_found'
}

export interface LoopIterationCompleteEvent {
  type: 'loop.iteration_complete'
  iteration: number
  maxIterations: number
}

export interface LoopEndedEvent {
  type: 'loop.ended'
  maxIterations: number
}

export interface LoopDockerDetectedEvent {
  type: 'loop.docker_detected'
  imageTag: string
}

export interface LoopDockerBuildingEvent {
  type: 'loop.docker_building'
  imageTag: string
}

export interface LoopDockerBuiltEvent {
  type: 'loop.docker_built'
  imageTag: string
}

export interface LoopDockerErrorEvent {
  type: 'loop.docker_error'
  error: string
}

export interface LoopInstallingEvent {
  type: 'loop.installing'
}

export interface LoopInstallFailedEvent {
  type: 'loop.install_failed'
  output: string
}

export interface LoopRunningChecksEvent {
  type: 'loop.running_checks'
}

export interface LoopChecksPassedEvent {
  type: 'loop.checks_passed'
}

export interface LoopChecksFailedEvent {
  type: 'loop.checks_failed'
  output: string
}

export type LoopEvent =
  | LoopWarningEvent
  | LoopStartedEvent
  | LoopSyncingEvent
  | LoopSyncSkippedEvent
  | LoopCheckingTasksEvent
  | LoopNoTasksEvent
  | LoopTasksFoundEvent
  | LoopIterationCompleteEvent
  | LoopEndedEvent
  | LoopDockerDetectedEvent
  | LoopDockerBuildingEvent
  | LoopDockerBuiltEvent
  | LoopDockerErrorEvent
  | LoopInstallingEvent
  | LoopInstallFailedEvent
  | LoopRunningChecksEvent
  | LoopChecksPassedEvent
  | LoopChecksFailedEvent

export type LoopEmitFn = (event: LoopEvent) => void

// Format a loop event for console output.
// Returns null for events that should not be displayed.
export function formatLoopEvent(event: LoopEvent): string | null {
  switch (event.type) {
    case 'loop.warning':
      return 'WARNING: This command skips all permission checks. Only use in a sandbox environment!'
    case 'loop.started': {
      const agent = event.agentType ?? 'claude'
      return `Starting dust loop ${agent} (max ${event.maxIterations} iterations)...`
    }
    case 'loop.syncing':
      return 'Syncing with remote'
    case 'loop.sync_skipped':
      return `Note: git pull skipped (${event.reason})`
    case 'loop.checking_tasks':
      return null
    case 'loop.no_tasks':
      return 'No tasks available. Sleeping...'
    case 'loop.tasks_found':
      return 'Found a task. Going to work!\n'
    case 'loop.iteration_complete':
      return `Completed iteration ${event.iteration}/${event.maxIterations}`
    case 'loop.ended':
      return `Reached max iterations (${event.maxIterations}). Exiting.`
    case 'loop.docker_detected':
      return `Docker mode: found .dust/config/container/Dockerfile (image: ${event.imageTag})`
    case 'loop.docker_building':
      return `Building Docker image ${event.imageTag}...`
    case 'loop.docker_built':
      return `Docker image ${event.imageTag} ready`
    case 'loop.docker_error':
      return `Docker error: ${event.error}`
    case 'loop.installing':
      return 'Installing dependencies'
    case 'loop.install_failed':
      return 'Dependency install failed'
    case 'loop.running_checks':
      return 'Running checks'
    case 'loop.checks_passed':
      return 'Checks passed'
    case 'loop.checks_failed':
      return 'Checks failed'
  }
}

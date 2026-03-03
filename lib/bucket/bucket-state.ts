/**
 * Pure functions for bucket message handling.
 *
 * This module implements the "Functional Core" pattern: pure functions that
 * take state and messages, returning new state plus effect descriptions.
 * The imperative shell (bucket.ts) interprets and executes the effects.
 */

import type { RepositoryListItem, ServerMessage } from './server-messages'

/**
 * Log effect - instructs the shell to log a message.
 */
export interface LogEffect {
  type: 'log'
  message: string
  stream: 'stdout' | 'stderr'
}

/**
 * SyncUI effect - instructs the shell to sync UI tabs with a repository list.
 */
export interface SyncUIEffect {
  type: 'syncUI'
  repositories: RepositoryListItem[]
}

/**
 * HandleRepositoryList effect - instructs the shell to handle the full
 * repository list processing (clone, start loops, etc.) asynchronously.
 */
export interface HandleRepositoryListEffect {
  type: 'handleRepositoryList'
  repositories: RepositoryListItem[]
}

/**
 * SignalTaskAvailable effect - instructs the shell to signal a task is available
 * for a repository (wake its loop or mark pending).
 */
export interface SignalTaskAvailableEffect {
  type: 'signalTaskAvailable'
  repositoryName: string
}

/**
 * Debug log effect - instructs the shell to log a debug message.
 */
export interface DebugLogEffect {
  type: 'debugLog'
  message: string
}

/**
 * All possible effects returned by pure message handlers.
 */
export type Effect =
  | LogEffect
  | SyncUIEffect
  | HandleRepositoryListEffect
  | SignalTaskAvailableEffect
  | DebugLogEffect

/**
 * Plain-object projection of the bucket state needed for message handling.
 * This is a snapshot - no functions or Maps, just data.
 */
export interface MessageHandlerState {
  /** Names of repositories currently tracked */
  repositoryNames: string[]
}

/**
 * Result from a pure message handler.
 */
export interface MessageHandlerResult {
  effects: Effect[]
}

/**
 * Handle a parsed server message and return effects to execute.
 * Pure function - no side effects, just returns effect descriptions.
 */
export function handleServerMessage(
  state: MessageHandlerState,
  message: ServerMessage
): MessageHandlerResult {
  const effects: Effect[] = []

  effects.push({
    type: 'debugLog',
    message: `ws message: ${message.type}`,
  })

  switch (message.type) {
    case 'repository-list': {
      const repos = message.repositories

      effects.push({
        type: 'log',
        message: `Received repository list (${repos.length} repositories):`,
        stream: 'stdout',
      })

      if (repos.length === 0) {
        effects.push({
          type: 'log',
          message: '  (empty)',
          stream: 'stdout',
        })
      } else {
        for (const r of repos) {
          effects.push({
            type: 'log',
            message: `  - name=${r.name}`,
            stream: 'stdout',
          })
          effects.push({
            type: 'log',
            message: `    id=${r.id}`,
            stream: 'stdout',
          })
          effects.push({
            type: 'log',
            message: `    gitUrl=${r.gitUrl}`,
            stream: 'stdout',
          })
          effects.push({
            type: 'log',
            message: `    gitSshUrl=${r.gitSshUrl ?? '(none)'}`,
            stream: 'stdout',
          })
          effects.push({
            type: 'log',
            message: `    url=${r.url}`,
            stream: 'stdout',
          })
          effects.push({
            type: 'log',
            message: `    hasTask=${r.hasTask}`,
            stream: 'stdout',
          })
        }
      }

      effects.push({
        type: 'syncUI',
        repositories: repos,
      })

      effects.push({
        type: 'handleRepositoryList',
        repositories: repos,
      })
      break
    }

    case 'task-available': {
      const repoName = message.repository

      effects.push({
        type: 'log',
        message: `Received task-available for ${repoName}`,
        stream: 'stdout',
      })

      if (state.repositoryNames.includes(repoName)) {
        effects.push({
          type: 'signalTaskAvailable',
          repositoryName: repoName,
        })
      } else {
        effects.push({
          type: 'log',
          message: `No repository state found for ${repoName}`,
          stream: 'stderr',
        })
      }
      break
    }
  }

  return { effects }
}

/**
 * Handle a message parse error and return effects to execute.
 * Pure function - no side effects, just returns effect descriptions.
 */
export function handleMessageParseError(rawData: string): MessageHandlerResult {
  return {
    effects: [
      {
        type: 'log',
        message: `Failed to parse WebSocket message: ${rawData}`,
        stream: 'stderr',
      },
    ],
  }
}

/**
 * Handle an invalid message format and return effects to execute.
 * Pure function - no side effects, just returns effect descriptions.
 */
export function handleInvalidMessageFormat(
  rawData: string
): MessageHandlerResult {
  return {
    effects: [
      {
        type: 'log',
        message: `Invalid WebSocket message format: ${rawData}`,
        stream: 'stderr',
      },
    ],
  }
}

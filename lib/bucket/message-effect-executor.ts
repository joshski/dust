/**
 * Message effect executor - imperative shell for message effects.
 *
 * This module executes the effects returned by pure message handlers.
 * The MessageEffectDeps interface allows testing without WebSocket connections.
 */

import type {
  ConnectionReadyEffect,
  ConnectionRejectedEffect,
  DebugLogEffect,
  HandleRepositoryListEffect,
  LogEffect,
  SignalTaskAvailableEffect,
  StoreToolDefinitionsEffect,
  SyncUIEffect,
} from './bucket-state'
import type { RepositoryListItem, ToolDefinition } from './server-messages'

/**
 * Union of message-related effects handled by this executor.
 * These effects don't require token or reconnection scheduling.
 */
export type MessageEffect =
  | LogEffect
  | DebugLogEffect
  | SyncUIEffect
  | HandleRepositoryListEffect
  | SignalTaskAvailableEffect
  | StoreToolDefinitionsEffect
  | ConnectionReadyEffect
  | ConnectionRejectedEffect

/**
 * Dependencies for executing message effects.
 * Provides the minimal interface needed for effect execution.
 */
export interface MessageEffectDeps {
  /** Log a message to output (TUI or console) */
  logMessage(message: string, stream: 'stdout' | 'stderr'): void
  /** Log a debug message */
  debugLog(message: string): void
  /** Sync UI tabs with repository list */
  syncUIWithRepoList(repositories: RepositoryListItem[]): void
  /** Handle repository list processing asynchronously */
  handleRepositoryList(repositories: RepositoryListItem[]): void
  /** Signal that a task is available for a repository */
  signalTaskAvailable(repositoryName: string): void
  /** Store tool definitions */
  storeToolDefinitions(tools: ToolDefinition[]): void
  /** Handle connection ready: store tools and process repositories atomically */
  handleConnectionReady(
    tools: ToolDefinition[],
    repositories: RepositoryListItem[]
  ): void
  /** Handle connection rejected: signal rejection to caller */
  handleConnectionRejected(reason: string): void
}

/**
 * Type guard to check if an effect is a message effect.
 */
export function isMessageEffect(effect: {
  type: string
}): effect is MessageEffect {
  return [
    'log',
    'debugLog',
    'syncUI',
    'handleRepositoryList',
    'signalTaskAvailable',
    'storeToolDefinitions',
    'connectionReady',
    'connectionRejected',
  ].includes(effect.type)
}

/**
 * Execute a message effect using the provided dependencies.
 * This is the imperative shell that interprets pure handler results.
 */
export function executeMessageEffect(
  effect: MessageEffect,
  dependencies: MessageEffectDeps
): void {
  switch (effect.type) {
    case 'log':
      dependencies.logMessage(effect.message, effect.stream)
      break

    case 'debugLog':
      dependencies.debugLog(effect.message)
      break

    case 'syncUI':
      dependencies.syncUIWithRepoList(effect.repositories)
      break

    case 'handleRepositoryList':
      dependencies.handleRepositoryList(effect.repositories)
      break

    case 'signalTaskAvailable':
      dependencies.signalTaskAvailable(effect.repositoryName)
      break

    case 'storeToolDefinitions':
      dependencies.storeToolDefinitions(effect.tools)
      break

    case 'connectionReady':
      dependencies.handleConnectionReady(effect.tools, effect.repositories)
      break

    case 'connectionRejected':
      dependencies.handleConnectionRejected(effect.reason)
      break
  }
}

/**
 * Execute multiple message effects.
 * Filters to only message effects and executes them in order.
 */
export function executeMessageEffects(
  effects: { type: string }[],
  dependencies: MessageEffectDeps
): void {
  for (const effect of effects) {
    if (isMessageEffect(effect)) {
      executeMessageEffect(effect, dependencies)
    }
  }
}

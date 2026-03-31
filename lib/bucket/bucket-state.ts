/**
 * Pure functions for bucket message handling.
 *
 * This module implements the "Functional Core" pattern: pure functions that
 * take state and messages, returning new state plus effect descriptions.
 * The imperative shell (bucket.ts) interprets and executes the effects.
 */

import type {
  RepositoryListItem,
  ServerMessage,
  ToolDefinition,
} from './server-messages'

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
 * Quit effect - instructs the shell to initiate shutdown.
 */
export interface QuitEffect {
  type: 'quit'
}

/**
 * Open browser effect - instructs the shell to open a URL in the browser.
 */
export interface OpenBrowserEffect {
  type: 'openBrowser'
  url: string
}

/**
 * Select next effect - instructs the shell to select the next repository tab.
 */
export interface SelectNextEffect {
  type: 'selectNext'
}

/**
 * Select previous effect - instructs the shell to select the previous repository tab.
 */
export interface SelectPreviousEffect {
  type: 'selectPrevious'
}

/**
 * Scroll effect - instructs the shell to scroll the log view.
 */
export interface ScrollEffect {
  type: 'scroll'
  direction: 'up' | 'down' | 'pageUp' | 'pageDown' | 'top' | 'bottom'
}

/**
 * ScheduleReconnect effect - instructs the shell to schedule a WebSocket reconnection.
 */
export interface ScheduleReconnectEffect {
  type: 'scheduleReconnect'
  delayMs: number
}

/**
 * StoreToolDefinitions effect - instructs the shell to update in-memory tool definitions.
 */
export interface StoreToolDefinitionsEffect {
  type: 'storeToolDefinitions'
  tools: ToolDefinition[]
}

/**
 * ConnectionReady effect - instructs the shell to process connection-ready payload atomically.
 */
export interface ConnectionReadyEffect {
  type: 'connectionReady'
  tools: ToolDefinition[]
  repositories: RepositoryListItem[]
}

/**
 * ConnectionRejected effect - instructs the shell to log rejection and shut down.
 */
export interface ConnectionRejectedEffect {
  type: 'connectionRejected'
  reason: string
  minimumVersion?: string
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
  | QuitEffect
  | OpenBrowserEffect
  | SelectNextEffect
  | SelectPreviousEffect
  | ScrollEffect
  | ScheduleReconnectEffect
  | StoreToolDefinitionsEffect
  | ConnectionReadyEffect
  | ConnectionRejectedEffect

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
            message: `    gitSshUrl=${r.gitSshUrl}`,
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
          if (r.agentProvider) {
            effects.push({
              type: 'log',
              message: `    agentProvider=${r.agentProvider}`,
              stream: 'stdout',
            })
          }
          if (r.branch) {
            effects.push({
              type: 'log',
              message: `    branch=${r.branch}`,
              stream: 'stdout',
            })
          }
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

    case 'tool-definitions': {
      const toolCount = message.tools.length
      effects.push({
        type: 'log',
        message: `Received tool definitions (${toolCount} tool${toolCount === 1 ? '' : 's'})`,
        stream: 'stdout',
      })

      effects.push({
        type: 'storeToolDefinitions',
        tools: message.tools,
      })
      break
    }

    case 'connection-ready': {
      const toolCount = message.tools.length
      const repoCount = message.repositories.length
      effects.push({
        type: 'log',
        message: `Connection ready (${toolCount} tool${toolCount === 1 ? '' : 's'}, ${repoCount} repositor${repoCount === 1 ? 'y' : 'ies'})`,
        stream: 'stdout',
      })

      effects.push({
        type: 'connectionReady',
        tools: message.tools,
        repositories: message.repositories,
      })
      break
    }

    case 'connection-rejected': {
      effects.push({
        type: 'log',
        message: `Connection rejected: ${message.reason}`,
        stream: 'stderr',
      })
      if (message.minimumVersion) {
        effects.push({
          type: 'log',
          message: `Minimum version required: ${message.minimumVersion}`,
          stream: 'stderr',
        })
      }

      effects.push({
        type: 'connectionRejected',
        reason: message.reason,
        minimumVersion: message.minimumVersion,
      })
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

/**
 * Key input constants (duplicated from terminal-ui for pure function isolation).
 */
const KEYS = {
  UP: '\x1b[A',
  DOWN: '\x1b[B',
  RIGHT: '\x1b[C',
  LEFT: '\x1b[D',
  PAGE_UP: '\x1b[5~',
  PAGE_DOWN: '\x1b[6~',
  HOME: '\x1b[H',
  END: '\x1b[F',
  CTRL_C: '\x03',
} as const

/**
 * Parse SGR mouse events (\x1b[<button;col;rowM or m).
 * Returns the button number or null if not a mouse event.
 */
// biome-ignore lint/complexity/useRegexLiterals: regex literal triggers noControlCharactersInRegex
const SGR_MOUSE_RE = new RegExp(String.raw`^\x1b\[<(\d+);\d+;\d+[Mm]$`)

function parseSGRMouse(key: string): number | null {
  const match = key.match(SGR_MOUSE_RE)
  if (!match) return null
  return Number.parseInt(match[1], 10)
}

/**
 * Plain-object projection of the UI state needed for keypress handling.
 */
export interface KeypressHandlerState {
  /** Currently selected repository index (-1 for "All") */
  selectedIndex: number
  /** List of repository names */
  repositories: string[]
  /** Map of repository names to URLs */
  repositoryUrls: Record<string, string>
}

/**
 * Result from the keypress handler.
 */
interface KeypressHandlerResult {
  effects: Effect[]
}

/**
 * Handle a keypress and return effects to execute.
 * Pure function - no side effects, just returns effect descriptions.
 *
 * The shell is responsible for executing the effects:
 * - 'quit': trigger shutdown
 * - 'openBrowser': open URL in browser
 * - 'selectNext'/'selectPrevious': call terminal-ui navigation functions
 * - 'scroll': call terminal-ui scroll functions
 */
export function handleKeypress(
  state: KeypressHandlerState,
  key: string
): KeypressHandlerResult {
  const effects: Effect[] = []

  // Check for SGR mouse events (scroll wheel)
  const mouseButton = parseSGRMouse(key)
  if (mouseButton !== null) {
    if (mouseButton === 64) {
      effects.push({ type: 'scroll', direction: 'up' })
      effects.push({ type: 'scroll', direction: 'up' })
      effects.push({ type: 'scroll', direction: 'up' })
    } else if (mouseButton === 65) {
      effects.push({ type: 'scroll', direction: 'down' })
      effects.push({ type: 'scroll', direction: 'down' })
      effects.push({ type: 'scroll', direction: 'down' })
    }
    return { effects }
  }

  switch (key) {
    case 'q':
    case KEYS.CTRL_C:
      effects.push({ type: 'quit' })
      break
    case KEYS.LEFT:
      effects.push({ type: 'selectPrevious' })
      break
    case KEYS.RIGHT:
      effects.push({ type: 'selectNext' })
      break
    case KEYS.UP:
      effects.push({ type: 'scroll', direction: 'up' })
      break
    case KEYS.DOWN:
      effects.push({ type: 'scroll', direction: 'down' })
      break
    case KEYS.PAGE_UP:
      effects.push({ type: 'scroll', direction: 'pageUp' })
      break
    case KEYS.PAGE_DOWN:
      effects.push({ type: 'scroll', direction: 'pageDown' })
      break
    case 'g':
    case KEYS.HOME:
      effects.push({ type: 'scroll', direction: 'top' })
      break
    case 'G':
    case KEYS.END:
      effects.push({ type: 'scroll', direction: 'bottom' })
      break
    case 'o': {
      // Open the selected repository's URL in the browser
      if (state.selectedIndex === -1) {
        // "All" tab - do nothing
        break
      }
      const repoName = state.repositories[state.selectedIndex]
      if (!repoName) break
      const url = state.repositoryUrls[repoName]
      if (url) {
        effects.push({ type: 'openBrowser', url })
      }
      break
    }
  }

  return { effects }
}

// --- WebSocket Connection Lifecycle ---

/** Constants for reconnection timing */
export const INITIAL_RECONNECT_DELAY_MS = 1000
export const MAX_RECONNECT_DELAY_MS = 30000

// --- Connection Replacement Logic ---

/**
 * Information about a WebSocket connection needed for replacement decisions.
 */
export interface ConnectionInfo {
  /** Optional machine identifier from connection-init */
  machineId?: string
  /** User identifier (e.g., userId or token) */
  userId: string
}

/**
 * Determine if a new incoming connection should replace an existing connection.
 * Pure function implementing machine-aware connection replacement logic.
 *
 * Rules:
 * 1. Same machine replacement: If both have machineId and they match, replace
 * 2. Different machine coexistence: If both have machineId and they differ, coexist (don't replace)
 * 3. Legacy behavior: If incoming lacks machineId, replace all (backward compatible)
 * 4. Mixed scenario: Existing without machineId is replaced by any new connection
 *
 * @param existing - Information about the existing connection
 * @param incoming - Information about the new connection attempting to connect
 * @returns true if existing should be closed with code 4000, false if they should coexist
 */
export function shouldReplaceConnection(
  existing: ConnectionInfo,
  incoming: ConnectionInfo
): boolean {
  // Rule 3: Incoming connection without machineId replaces all existing connections (legacy behavior)
  if (!incoming.machineId) {
    return true
  }

  // Rule 4: Existing connection without machineId is replaced by any new connection with machineId
  if (!existing.machineId) {
    return true
  }

  // Both have machineId - Rule 1 or 2
  // Rule 1: Same machineId → replace
  // Rule 2: Different machineId → coexist (don't replace)
  return existing.machineId === incoming.machineId
}

/**
 * State needed for connection lifecycle handlers.
 */
export interface ConnectionLifecycleState {
  /** Current reconnect delay in milliseconds */
  reconnectDelay: number
  /** Whether the bucket is shutting down */
  shuttingDown: boolean
}

/**
 * Result from connection lifecycle handlers.
 * Includes both updated state and effects to execute.
 */
interface ConnectionLifecycleResult {
  state: ConnectionLifecycleState
  effects: Effect[]
}

/**
 * Handle WebSocket close event.
 * Returns updated state and effects (log, scheduleReconnect).
 *
 * Code 4000 means we were replaced by another connection from the same machine;
 * in that case we don't reconnect to avoid an infinite replacement loop.
 * With machine IDs, connections from different machines coexist, but connections
 * from the same machine replace each other.
 */
export function handleClose(
  state: ConnectionLifecycleState,
  code: number,
  reason: string
): ConnectionLifecycleResult {
  const effects: Effect[] = []

  effects.push({
    type: 'log',
    message: `bucket.disconnected code=${code} reason=${reason || 'none'}`,
    stream: 'stdout',
  })

  // Code 4000: replaced by another connection from the same machine - don't reconnect
  if (code === 4000) {
    effects.push({
      type: 'log',
      message: 'Another connection replaced this one. Not reconnecting.',
      stream: 'stdout',
    })
    return { state, effects }
  }

  // Schedule reconnection unless shutting down
  if (!state.shuttingDown) {
    effects.push({
      type: 'log',
      message: `Reconnecting in ${state.reconnectDelay / 1000} seconds...`,
      stream: 'stdout',
    })

    effects.push({
      type: 'scheduleReconnect',
      delayMs: state.reconnectDelay,
    })

    // Calculate next delay with exponential backoff
    const nextDelay = Math.min(state.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS)
    return {
      state: { ...state, reconnectDelay: nextDelay },
      effects,
    }
  }

  return { state, effects }
}

/**
 * Handle WebSocket error event.
 * Returns effects to log the error.
 */
export function handleError(
  state: ConnectionLifecycleState,
  errorMessage: string
): ConnectionLifecycleResult {
  return {
    state,
    effects: [
      {
        type: 'log',
        message: `WebSocket error: ${errorMessage}`,
        stream: 'stderr',
      },
    ],
  }
}

/**
 * Handle WebSocket open event.
 * Resets reconnect delay and logs connected status.
 */
export function handleOpen(
  state: ConnectionLifecycleState
): ConnectionLifecycleResult {
  return {
    state: { ...state, reconnectDelay: INITIAL_RECONNECT_DELAY_MS },
    effects: [
      {
        type: 'log',
        message: 'bucket.connected',
        stream: 'stdout',
      },
    ],
  }
}

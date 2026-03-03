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

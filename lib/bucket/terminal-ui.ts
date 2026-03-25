/**
 * Terminal UI for dust bucket.
 *
 * Provides ANSI-based rendering for viewing logs from multiple repositories.
 * Uses raw ANSI codes (no TUI library) to align with minimal-dependencies goal.
 */

import type { LogBuffer, LogLine } from './log-buffer'
import { getLogLines } from './log-buffer'

/** Characters used in the TUI — uses only widely available glyphs. */
export const CHARS = {
  dot: '*',
  sparkle: '',
  ellipsis: '...',
  hline: '-',
  arrows_lr: '<->',
  arrows_ud: 'up/dn',
  scroll_down: 'v',
}

// ANSI escape codes
export const ANSI = {
  // Cursor control
  HIDE_CURSOR: '\x1b[?25l',
  SHOW_CURSOR: '\x1b[?25h',
  MOVE_TO: (row: number, col: number) => `\x1b[${row};${col}H`,
  CLEAR_LINE: '\x1b[2K',
  CLEAR_SCREEN: '\x1b[2J',

  // Alternate screen buffer
  ENTER_ALT_SCREEN: '\x1b[?1049h',
  EXIT_ALT_SCREEN: '\x1b[?1049l',

  // Colors
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  UNDERLINE: '\x1b[4m',
  INVERSE: '\x1b[7m',

  // Foreground colors
  FG_BLACK: '\x1b[30m',
  FG_RED: '\x1b[31m',
  FG_GREEN: '\x1b[32m',
  FG_YELLOW: '\x1b[33m',
  FG_BLUE: '\x1b[34m',
  FG_MAGENTA: '\x1b[35m',
  FG_CYAN: '\x1b[36m',
  FG_WHITE: '\x1b[37m',

  // Background colors
  BG_BLACK: '\x1b[40m',
  BG_RED: '\x1b[41m',
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m',
  BG_BLUE: '\x1b[44m',
  BG_MAGENTA: '\x1b[45m',
  BG_CYAN: '\x1b[46m',
  BG_WHITE: '\x1b[47m',
} as const

// Colors for repository prefixes (cycle through these)
export const REPO_COLORS = [
  ANSI.FG_CYAN,
  ANSI.FG_MAGENTA,
  ANSI.FG_YELLOW,
  ANSI.FG_GREEN,
  ANSI.FG_BLUE,
  ANSI.FG_RED,
] as const

/** Fixed color for the system tab/prefix. */
export const SYSTEM_COLOR = ANSI.DIM

/**
 * Get the visible length of a string, excluding ANSI escape codes.
 */
export function visibleLength(text: string): number {
  // Remove all ANSI escape sequences
  // oxlint-disable-next-line no-control-regex -- ANSI codes require matching escape character
  return text.replace(/\u001b\[[0-9;]*m/g, '').length
}

/**
 * Truncate a string to a maximum visible length, preserving ANSI codes.
 * Adds ellipsis if truncated.
 */
export function truncateLine(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return ''
  const textLength = visibleLength(text)
  if (textLength <= maxWidth) return text

  // oxlint-disable-next-line no-control-regex -- ANSI codes require matching escape character
  const ansiRegex = /\u001b\[[0-9;]*m/g
  const truncateAt = maxWidth - CHARS.ellipsis.length
  let visibleCount = 0
  let result = ''
  let lastIndex = 0

  for (
    let match = ansiRegex.exec(text);
    match !== null;
    match = ansiRegex.exec(text)
  ) {
    // Add visible characters before this ANSI code
    const textBefore = text.slice(lastIndex, match.index)
    for (const char of textBefore) {
      if (visibleCount >= truncateAt) {
        return result + CHARS.ellipsis + ANSI.RESET
      }
      result += char
      visibleCount++
    }
    // Add the ANSI code
    result += match[0]
    lastIndex = match.index + match[0].length
  }

  // Add remaining text after the last ANSI code (or all text if no ANSI codes).
  // Since textLength > maxWidth (guard above), visibleCount will reach truncateAt.
  const remaining = text.slice(lastIndex)
  for (const char of remaining) {
    if (visibleCount >= truncateAt) {
      return result + CHARS.ellipsis + ANSI.RESET
    }
    result += char
    visibleCount++
  }

  /* istanbul ignore next @preserve -- unreachable: textLength > maxWidth guarantees visibleCount
     reaches truncateAt before exhausting all characters. Required for TypeScript. */
  return result + ANSI.RESET
}

/**
 * Terminal UI state.
 */
export interface TerminalUIState {
  /** List of repository names */
  repositories: string[]
  /** Currently selected repository index (-1 for "All") */
  selectedIndex: number
  /** Log buffers for each repository, keyed by name */
  logBuffers: Map<string, LogBuffer>
  /** Agent status for each repository, keyed by name */
  agentStatuses: Map<string, 'idle' | 'busy'>
  /** Repository URLs for each repository, keyed by name */
  repositoryUrls: Map<string, string>
  /** Current scroll offset (0 = bottom, positive = scrolled up) */
  scrollOffset: number
  /** Whether auto-scroll is enabled (follows new logs) */
  autoScroll: boolean
  /** Terminal dimensions */
  width: number
  height: number
  /** Hostname of the connected server */
  connectedHost: string
}

/**
 * Create initial terminal UI state.
 */
export function createTerminalUIState(): TerminalUIState {
  return {
    repositories: [],
    selectedIndex: -1, // -1 = "All"
    logBuffers: new Map(),
    agentStatuses: new Map(),
    repositoryUrls: new Map(),
    scrollOffset: 0,
    autoScroll: true,
    width: 80,
    height: 24,
    connectedHost: '',
  }
}

/**
 * Update terminal dimensions in state.
 */
export function updateDimensions(
  state: TerminalUIState,
  width: number,
  height: number
): void {
  state.width = width
  state.height = height
}

/**
 * Add or update a repository in the UI state.
 */
export function addRepository(
  state: TerminalUIState,
  name: string,
  logBuffer: LogBuffer,
  url?: string
): void {
  if (!state.repositories.includes(name)) {
    state.repositories.push(name)
    state.repositories.sort((a, b) => {
      if (a === 'system') return 1
      if (b === 'system') return -1
      return a.localeCompare(b)
    })
    state.agentStatuses.set(name, 'idle')
  }
  state.logBuffers.set(name, logBuffer)
  if (url) {
    state.repositoryUrls.set(name, url)
  }
}

/**
 * Remove a repository from the UI state.
 */
export function removeRepository(state: TerminalUIState, name: string): void {
  const index = state.repositories.indexOf(name)
  if (index >= 0) {
    state.repositories.splice(index, 1)
    state.logBuffers.delete(name)
    state.agentStatuses.delete(name)
    state.repositoryUrls.delete(name)
    // Adjust selected index if needed
    if (state.selectedIndex >= state.repositories.length) {
      state.selectedIndex = state.repositories.length - 1
    }
  }
}

/**
 * Select the next repository (right arrow).
 */
export function selectNext(state: TerminalUIState): void {
  if (state.repositories.length === 0) return
  state.selectedIndex++
  if (state.selectedIndex >= state.repositories.length) {
    state.selectedIndex = -1 // Wrap to "All"
  }
}

/**
 * Select the previous repository (left arrow).
 */
export function selectPrevious(state: TerminalUIState): void {
  if (state.repositories.length === 0) return
  state.selectedIndex--
  if (state.selectedIndex < -1) {
    state.selectedIndex = state.repositories.length - 1 // Wrap to last repo
  }
}

/**
 * Scroll up by a number of lines.
 */
export function scrollUp(state: TerminalUIState, lines = 1): void {
  const logs = getVisibleLogs(state)
  const maxScroll = Math.max(0, logs.length - getLogAreaHeight(state))
  state.scrollOffset = Math.min(state.scrollOffset + lines, maxScroll)
  if (state.scrollOffset > 0) {
    state.autoScroll = false
  }
}

/**
 * Scroll down by a number of lines.
 */
export function scrollDown(state: TerminalUIState, lines = 1): void {
  state.scrollOffset = Math.max(0, state.scrollOffset - lines)
  if (state.scrollOffset === 0) {
    state.autoScroll = true
  }
}

/**
 * Scroll to the top.
 */
export function scrollToTop(state: TerminalUIState): void {
  const logs = getVisibleLogs(state)
  const maxScroll = Math.max(0, logs.length - getLogAreaHeight(state))
  state.scrollOffset = maxScroll
  state.autoScroll = false
}

/**
 * Scroll to the bottom.
 */
export function scrollToBottom(state: TerminalUIState): void {
  state.scrollOffset = 0
  state.autoScroll = true
}

/**
 * Get the number of rows needed to render the tabs without breaking any tab.
 */
export function getTabRowCount(state: TerminalUIState): number {
  if (state.width <= 0) return 1

  // " All " = 5 visible chars
  const tabWidths: number[] = [5]
  for (const name of state.repositories) {
    tabWidths.push(name.length + 2 + CHARS.dot.length + 1) // " <dot> name " (space + dot + space + name + space)
  }

  let rows = 1
  let currentRowWidth = 0

  for (const tabWidth of tabWidths) {
    const separatorWidth = currentRowWidth > 0 ? 1 : 0
    if (
      currentRowWidth + separatorWidth + tabWidth > state.width &&
      currentRowWidth > 0
    ) {
      rows++
      currentRowWidth = tabWidth
    } else {
      currentRowWidth += separatorWidth + tabWidth
    }
  }

  return rows
}

/**
 * Get the height available for the log area.
 */
export function getLogAreaHeight(state: TerminalUIState): number {
  const tabRows = getTabRowCount(state)
  // Header (1) + tabs (tabRows) + help (1) + separator (1)
  return Math.max(1, state.height - (tabRows + 3))
}

/**
 * Extended log line with repository info for "All" view.
 */
interface DisplayLogLine extends LogLine {
  repository: string
  color: string
}

/**
 * Get the display color for a repository by its index in the list.
 */
export function getRepoColor(name: string, index: number): string {
  if (name === 'system') return SYSTEM_COLOR
  return REPO_COLORS[index % REPO_COLORS.length]
}

/**
 * Get visible logs based on current selection.
 */
export function getVisibleLogs(state: TerminalUIState): DisplayLogLine[] {
  if (state.selectedIndex === -1) {
    // "All" view: merge logs from all repositories
    const allLogs: DisplayLogLine[] = []
    for (let i = 0; i < state.repositories.length; i++) {
      const repoName = state.repositories[i]
      const buffer = state.logBuffers.get(repoName)
      if (!buffer) continue
      const color = getRepoColor(repoName, i)
      const lines = getLogLines(buffer)
      for (const line of lines) {
        allLogs.push({ ...line, repository: repoName, color })
      }
    }

    // Sort by timestamp
    allLogs.sort((a, b) => a.timestamp - b.timestamp)
    return allLogs
  }

  // Single repository view
  const repoName = state.repositories[state.selectedIndex]
  if (!repoName) return []

  const buffer = state.logBuffers.get(repoName)
  if (!buffer) return []

  const color = getRepoColor(repoName, state.selectedIndex)
  return getLogLines(buffer).map(line => ({
    ...line,
    repository: repoName,
    color,
  }))
}

/**
 * Render the repository selector tabs.
 * Returns an array of rows, wrapping tabs to the next line when they
 * exceed the terminal width (without breaking any individual tab).
 */
export function renderTabs(state: TerminalUIState): string[] {
  // Build individual tab strings with their visible widths
  const tabs: { text: string; width: number }[] = []

  // "All" tab (no status dot)
  if (state.selectedIndex === -1) {
    tabs.push({ text: `${ANSI.INVERSE} All ${ANSI.RESET}`, width: 5 })
  } else {
    tabs.push({ text: ' All ', width: 5 })
  }

  // Repository tabs (with status dots)
  for (let i = 0; i < state.repositories.length; i++) {
    const name = state.repositories[i]
    const color = getRepoColor(name, i)
    const agentStatus = state.agentStatuses.get(name) ?? 'idle'
    const dotColor = agentStatus === 'busy' ? ANSI.FG_GREEN : ANSI.DIM
    const dot = `${dotColor}${CHARS.dot}${ANSI.RESET}`
    const width = name.length + 2 + CHARS.dot.length + 1 // " <dot> name " (space + dot + space + name + space)
    if (i === state.selectedIndex) {
      tabs.push({
        text: ` ${dot}${color} ${ANSI.INVERSE}${name}${ANSI.RESET} `,
        width,
      })
    } else {
      tabs.push({ text: ` ${dot}${color} ${name} ${ANSI.RESET}`, width })
    }
  }

  // Wrap tabs into rows
  const rows: { text: string; width: number }[][] = [[]]
  let currentRowWidth = 0

  for (const tab of tabs) {
    const separatorWidth = currentRowWidth > 0 ? 1 : 0
    if (
      currentRowWidth + separatorWidth + tab.width > state.width &&
      currentRowWidth > 0
    ) {
      rows.push([tab])
      currentRowWidth = tab.width
    } else {
      rows[rows.length - 1].push(tab)
      currentRowWidth += separatorWidth + tab.width
    }
  }

  return rows.map(row => row.map(t => t.text).join('|'))
}

/**
 * Render the help line.
 */
export function renderHelpLine(): string {
  return `${ANSI.DIM}[${CHARS.arrows_lr}] select  [${CHARS.arrows_ud}] scroll  [PgUp/PgDn] page  [g/G] top/bottom  [o] open  [q] quit${ANSI.RESET}`
}

/**
 * Render a horizontal separator line.
 */
export function renderSeparator(width: number): string {
  return CHARS.hline.repeat(Math.max(0, width))
}

/**
 * Format a log line for display.
 */
export function formatLogLine(
  line: DisplayLogLine,
  prefixAlign: number,
  maxWidth: number
): string {
  let prefix = ''
  let prefixWidth = 0

  if (prefixAlign > 0) {
    const paddedName = line.repository.padEnd(prefixAlign)
    prefix = `${line.color}${paddedName}${ANSI.RESET} ${ANSI.DIM}|${ANSI.RESET} `
    prefixWidth = prefixAlign + 3 // "paddedName | "
  }

  // Show timestamps on system log lines
  let timePrefix = ''
  let timePrefixWidth = 0
  if (line.repository === 'system') {
    const d = new Date(line.timestamp)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    timePrefix = `${ANSI.DIM}${hh}:${mm}:${ss}${ANSI.RESET} `
    timePrefixWidth = 9 // "HH:MM:SS "
  }

  const textColor = line.stream === 'stderr' ? ANSI.FG_RED : ''
  const textReset = line.stream === 'stderr' ? ANSI.RESET : ''
  // Strip newlines to guarantee single-line output (some event formatters
  // include trailing \n which would push the TUI frame past terminal height)
  const sanitizedText = line.text.replace(/[\r\n]+/g, '')
  const text = `${textColor}${sanitizedText}${textReset}`

  const availableWidth = maxWidth - prefixWidth - timePrefixWidth
  if (availableWidth <= 0) return prefix + timePrefix

  return prefix + timePrefix + truncateLine(text, availableWidth)
}

/**
 * Render the complete terminal UI frame.
 * Returns a string that can be written to stdout.
 */
export function renderFrame(state: TerminalUIState): string {
  const lines: string[] = []

  // Line 1: Header
  const hostLabel = state.connectedHost
    ? ` ${ANSI.DIM}[connected to ${state.connectedHost}]${ANSI.RESET}`
    : ''
  lines.push(`${ANSI.BOLD}${CHARS.sparkle}dust bucket${ANSI.RESET}${hostLabel}`)

  // Line 2+: Repository tabs (may span multiple rows)
  const tabRows = renderTabs(state)
  for (const tabRow of tabRows) {
    lines.push(tabRow)
  }

  // Reserve one column to prevent terminal line-wrap issues.
  // Lines filling the exact terminal width cause the cursor to wrap,
  // shifting the whole frame down and scrolling the header off-screen.
  const contentWidth = state.width - 1

  // Line 3: Help line
  lines.push(truncateLine(renderHelpLine(), contentWidth))

  // Line 4: Separator
  lines.push(renderSeparator(contentWidth))

  // Get logs and calculate visible range
  const logs = getVisibleLogs(state)
  const logAreaHeight = getLogAreaHeight(state)
  const prefixAlign =
    state.selectedIndex === -1
      ? Math.max(0, ...state.repositories.map(r => r.length))
      : 0

  // Calculate which logs to show
  const totalLogs = logs.length
  const endIndex = Math.max(0, totalLogs - state.scrollOffset)
  const startIndex = Math.max(0, endIndex - logAreaHeight)

  // Render log lines
  for (let i = startIndex; i < endIndex; i++) {
    const logLine = logs[i]
    lines.push(formatLogLine(logLine, prefixAlign, contentWidth))
  }

  // Pad with empty lines if needed
  const renderedLogLines = endIndex - startIndex
  for (let i = renderedLogLines; i < logAreaHeight; i++) {
    lines.push('')
  }

  // Add scroll indicator if scrolled up
  if (state.scrollOffset > 0) {
    const indicator = `${ANSI.DIM}${CHARS.scroll_down} ${state.scrollOffset} more${ANSI.RESET}`
    // Replace last line with scroll indicator
    lines[lines.length - 1] = indicator
  }

  // Build the full frame using absolute positioning per row.
  // This avoids terminal line-wrap issues when a line fills
  // the entire width (which would add an extra row with \n).
  const output: string[] = []

  for (let i = 0; i < lines.length; i++) {
    output.push(ANSI.MOVE_TO(i + 1, 1))
    output.push(ANSI.CLEAR_LINE)
    output.push(lines[i])
  }

  return output.join('')
}

/**
 * Enter the alternate screen buffer and hide cursor.
 */
export function enterAlternateScreen(): string {
  return (
    ANSI.ENTER_ALT_SCREEN +
    ANSI.HIDE_CURSOR +
    ANSI.CLEAR_SCREEN +
    '\x1b[?1000h' +
    '\x1b[?1006h'
  )
}

/**
 * Exit the alternate screen buffer and show cursor.
 */
export function exitAlternateScreen(): string {
  return `\x1b[?1006l\x1b[?1000l${ANSI.EXIT_ALT_SCREEN}${ANSI.SHOW_CURSOR}`
}

/**
 * Key input constants.
 */
export const KEYS = {
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
 * Options for handleKeyInput.
 */
interface HandleKeyInputOptions {
  /** Callback to open a URL in the browser */
  openBrowser?: (url: string) => void
}

/** Result of key handler: true = quit, false = continue */
type KeyHandlerResult = boolean

/** Handler function for a key input */
type KeyHandler = (
  state: TerminalUIState,
  options?: HandleKeyInputOptions
) => KeyHandlerResult

function handleSelectPrevious(state: TerminalUIState): KeyHandlerResult {
  selectPrevious(state)
  state.scrollOffset = 0
  state.autoScroll = true
  return false
}

function handleSelectNext(state: TerminalUIState): KeyHandlerResult {
  selectNext(state)
  state.scrollOffset = 0
  state.autoScroll = true
  return false
}

function handleOpenUrl(
  state: TerminalUIState,
  options?: HandleKeyInputOptions
): KeyHandlerResult {
  if (state.selectedIndex === -1) return false
  const repoName = state.repositories[state.selectedIndex]
  if (!repoName) return false
  const url = state.repositoryUrls.get(repoName)
  if (url && options?.openBrowser) {
    options.openBrowser(url)
  }
  return false
}

/** Map of key inputs to their handlers */
const KEY_HANDLERS: Record<string, KeyHandler> = {
  q: () => true,
  [KEYS.CTRL_C]: () => true,
  [KEYS.LEFT]: handleSelectPrevious,
  [KEYS.RIGHT]: handleSelectNext,
  [KEYS.UP]: state => (scrollUp(state, 1), false),
  [KEYS.DOWN]: state => (scrollDown(state, 1), false),
  [KEYS.PAGE_UP]: state => (scrollUp(state, getLogAreaHeight(state)), false),
  [KEYS.PAGE_DOWN]: state => (
    scrollDown(state, getLogAreaHeight(state)), false
  ),
  g: state => (scrollToTop(state), false),
  [KEYS.HOME]: state => (scrollToTop(state), false),
  G: state => (scrollToBottom(state), false),
  [KEYS.END]: state => (scrollToBottom(state), false),
  o: handleOpenUrl,
}

/**
 * Handle mouse scroll events.
 * Returns true if handled, false if not a mouse event.
 */
function handleMouseScroll(state: TerminalUIState, key: string): boolean {
  const mouseButton = parseSGRMouse(key)
  if (mouseButton === null) return false
  if (mouseButton === 64) scrollUp(state, 3)
  else if (mouseButton === 65) scrollDown(state, 3)
  return true
}

/**
 * Handle a key input and update state.
 * Returns true if the UI should quit.
 */
export function handleKeyInput(
  state: TerminalUIState,
  key: string,
  options?: HandleKeyInputOptions
): boolean {
  if (handleMouseScroll(state, key)) return false

  const handler = KEY_HANDLERS[key]
  if (handler) return handler(state, options)
  return false
}

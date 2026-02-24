import { describe, expect, it } from 'vitest'
import {
  appendLogLine,
  createLogBuffer,
  createLogLine,
  type LogBuffer,
} from './log-buffer'
import {
  ANSI,
  addRepository,
  CHARS,
  createTerminalUIState,
  enterAlternateScreen,
  exitAlternateScreen,
  formatLogLine,
  getLogAreaHeight,
  getRepoColor,
  getTabRowCount,
  getVisibleLogs,
  handleKeyInput,
  KEYS,
  REPO_COLORS,
  removeRepository,
  renderFrame,
  renderHelpLine,
  renderSeparator,
  renderTabs,
  SYSTEM_COLOR,
  scrollDown,
  scrollToBottom,
  scrollToTop,
  scrollUp,
  selectNext,
  selectPrevious,
  type TerminalUIState,
  truncateLine,
  updateDimensions,
  visibleLength,
} from './terminal-ui'

/**
 * Helper to get a log buffer from state, throwing if not found.
 */
function getBuffer(state: TerminalUIState, name: string): LogBuffer {
  const buffer = state.logBuffers.get(name)
  if (!buffer) {
    throw new Error(`Buffer not found for ${name}`)
  }
  return buffer
}

describe('visibleLength', () => {
  it('returns correct length for plain text', () => {
    expect(visibleLength('hello')).toBe(5)
    expect(visibleLength('')).toBe(0)
    expect(visibleLength('hello world')).toBe(11)
  })

  it('excludes ANSI escape codes from length', () => {
    expect(visibleLength(`${ANSI.FG_RED}hello${ANSI.RESET}`)).toBe(5)
    expect(visibleLength(`${ANSI.BOLD}${ANSI.FG_CYAN}test${ANSI.RESET}`)).toBe(
      4
    )
    expect(visibleLength(`${ANSI.INVERSE} All ${ANSI.RESET}`)).toBe(5)
  })

  it('handles multiple ANSI codes', () => {
    const text = `${ANSI.FG_RED}red${ANSI.RESET} ${ANSI.FG_BLUE}blue${ANSI.RESET}`
    expect(visibleLength(text)).toBe(8) // "red blue"
  })
})

describe('truncateLine', () => {
  it('returns original text when shorter than max width', () => {
    expect(truncateLine('hello', 10)).toBe('hello')
    expect(truncateLine('test', 4)).toBe('test')
  })

  it('truncates and adds ellipsis when longer than max width', () => {
    expect(truncateLine('hello world', 5)).toBe(
      `he${CHARS.ellipsis}${ANSI.RESET}`
    )
    expect(truncateLine('abcdef', 5)).toBe(`ab${CHARS.ellipsis}${ANSI.RESET}`)
  })

  it('preserves ANSI codes while truncating', () => {
    const text = `${ANSI.FG_RED}hello world${ANSI.RESET}`
    const truncated = truncateLine(text, 5)
    expect(truncated).toContain(ANSI.FG_RED)
    expect(visibleLength(truncated)).toBe(5)
  })

  it('handles zero width', () => {
    expect(truncateLine('hello', 0)).toBe('')
  })

  it('handles negative width', () => {
    expect(truncateLine('hello', -1)).toBe('')
  })

  it('preserves text with ANSI codes when not truncated', () => {
    const text = `${ANSI.FG_RED}hi${ANSI.RESET}`
    const result = truncateLine(text, 10)
    // Should return the original text since it fits
    expect(result).toContain(ANSI.FG_RED)
    expect(result).toContain('hi')
    expect(visibleLength(result)).toBe(2)
  })

  it('handles text with ANSI codes and trailing text', () => {
    // This test ensures the final return path is covered
    // The text has: ANSI code, visible text, ANSI code, visible text
    const text = `${ANSI.FG_RED}a${ANSI.RESET}b`
    const result = truncateLine(text, 10)
    expect(visibleLength(result)).toBe(2) // "ab"
    expect(result).toContain('a')
    expect(result).toContain('b')
  })

  it('truncates trailing text after ANSI codes', () => {
    // Text: ANSI-coded "a" then "bcdef" plain text - truncation happens in post-loop
    const text = `${ANSI.FG_RED}a${ANSI.RESET}bcdef`
    const result = truncateLine(text, 4)
    expect(visibleLength(result)).toBe(4) // "a..."
    expect(result).toContain(CHARS.ellipsis)
  })
})

describe('createTerminalUIState', () => {
  it('creates initial state with defaults', () => {
    const state = createTerminalUIState()
    expect(state.repositories).toEqual([])
    expect(state.selectedIndex).toBe(-1) // "All" selected by default
    expect(state.logBuffers.size).toBe(0)
    expect(state.agentStatuses.size).toBe(0)
    expect(state.scrollOffset).toBe(0)
    expect(state.autoScroll).toBe(true)
    expect(state.width).toBe(80)
    expect(state.height).toBe(24)
  })
})

describe('updateDimensions', () => {
  it('updates width and height', () => {
    const state = createTerminalUIState()
    updateDimensions(state, 120, 40)
    expect(state.width).toBe(120)
    expect(state.height).toBe(40)
  })
})

describe('addRepository', () => {
  it('adds a repository to the state', () => {
    const state = createTerminalUIState()
    const buffer = createLogBuffer()

    addRepository(state, 'repo1', buffer)

    expect(state.repositories).toContain('repo1')
    expect(state.logBuffers.get('repo1')).toBe(buffer)
  })

  it('initializes agent status to idle', () => {
    const state = createTerminalUIState()
    const buffer = createLogBuffer()

    addRepository(state, 'repo1', buffer)

    expect(state.agentStatuses.get('repo1')).toBe('idle')
  })

  it('maintains alphabetical order', () => {
    const state = createTerminalUIState()

    addRepository(state, 'zebra', createLogBuffer())
    addRepository(state, 'alpha', createLogBuffer())
    addRepository(state, 'middle', createLogBuffer())

    expect(state.repositories).toEqual(['alpha', 'middle', 'zebra'])
  })

  it('keeps system as the last tab', () => {
    const state = createTerminalUIState()

    addRepository(state, 'alpha', createLogBuffer())
    addRepository(state, 'system', createLogBuffer())
    addRepository(state, 'zebra', createLogBuffer())

    expect(state.repositories).toEqual(['alpha', 'zebra', 'system'])
  })

  it('initializes agent status to idle', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())

    expect(state.agentStatuses.get('repo1')).toBe('idle')
  })

  it('does not overwrite existing agent status', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    state.agentStatuses.set('repo1', 'busy')

    addRepository(state, 'repo1', createLogBuffer())

    expect(state.agentStatuses.get('repo1')).toBe('busy')
  })

  it('does not add duplicate repositories', () => {
    const state = createTerminalUIState()
    const buffer1 = createLogBuffer()
    const buffer2 = createLogBuffer()

    addRepository(state, 'repo1', buffer1)
    addRepository(state, 'repo1', buffer2)

    expect(state.repositories.length).toBe(1)
    expect(state.logBuffers.get('repo1')).toBe(buffer2) // Buffer is updated
  })

  it('stores URL when provided', () => {
    const state = createTerminalUIState()
    addRepository(
      state,
      'repo1',
      createLogBuffer(),
      'https://github.com/user/repo1'
    )

    expect(state.repositoryUrls.get('repo1')).toBe(
      'https://github.com/user/repo1'
    )
  })

  it('does not store URL when not provided', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())

    expect(state.repositoryUrls.has('repo1')).toBe(false)
  })
})

describe('removeRepository', () => {
  it('removes a repository from the state', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    addRepository(state, 'repo2', createLogBuffer())

    removeRepository(state, 'repo1')

    expect(state.repositories).not.toContain('repo1')
    expect(state.repositories).toContain('repo2')
    expect(state.logBuffers.has('repo1')).toBe(false)
  })

  it('removes agent status entry', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    addRepository(state, 'repo2', createLogBuffer())

    removeRepository(state, 'repo1')

    expect(state.agentStatuses.has('repo1')).toBe(false)
    expect(state.agentStatuses.has('repo2')).toBe(true)
  })

  it('removes URL entry', () => {
    const state = createTerminalUIState()
    addRepository(
      state,
      'repo1',
      createLogBuffer(),
      'https://github.com/user/repo1'
    )
    addRepository(
      state,
      'repo2',
      createLogBuffer(),
      'https://github.com/user/repo2'
    )

    removeRepository(state, 'repo1')

    expect(state.repositoryUrls.has('repo1')).toBe(false)
    expect(state.repositoryUrls.has('repo2')).toBe(true)
  })

  it('adjusts selected index when removing selected repo', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    addRepository(state, 'repo2', createLogBuffer())
    state.selectedIndex = 1 // Select repo2

    removeRepository(state, 'repo2')

    expect(state.selectedIndex).toBe(0)
  })

  it('handles removing non-existent repository', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())

    removeRepository(state, 'nonexistent')

    expect(state.repositories).toEqual(['repo1'])
  })
})

describe('selectNext', () => {
  it('moves selection forward', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    addRepository(state, 'repo2', createLogBuffer())
    state.selectedIndex = -1 // Start at "All"

    selectNext(state)
    expect(state.selectedIndex).toBe(0)

    selectNext(state)
    expect(state.selectedIndex).toBe(1)
  })

  it('wraps to "All" when at end', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    state.selectedIndex = 0

    selectNext(state)

    expect(state.selectedIndex).toBe(-1)
  })

  it('does nothing when no repositories', () => {
    const state = createTerminalUIState()
    selectNext(state)
    expect(state.selectedIndex).toBe(-1)
  })
})

describe('selectPrevious', () => {
  it('moves selection backward', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    addRepository(state, 'repo2', createLogBuffer())
    state.selectedIndex = 1

    selectPrevious(state)
    expect(state.selectedIndex).toBe(0)

    selectPrevious(state)
    expect(state.selectedIndex).toBe(-1)
  })

  it('wraps to last repo when at "All"', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    addRepository(state, 'repo2', createLogBuffer())
    state.selectedIndex = -1

    selectPrevious(state)

    expect(state.selectedIndex).toBe(1)
  })

  it('does nothing when no repositories', () => {
    const state = createTerminalUIState()
    selectPrevious(state)
    expect(state.selectedIndex).toBe(-1)
  })
})

describe('scrollUp', () => {
  it('increases scroll offset', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    // Add enough logs to allow scrolling
    const buffer = getBuffer(state, 'repo1')
    for (let i = 0; i < 100; i++) {
      appendLogLine(buffer, createLogLine(`line ${i}`, 'stdout', i))
    }

    scrollUp(state, 5)

    expect(state.scrollOffset).toBe(5)
    expect(state.autoScroll).toBe(false)
  })

  it('does not scroll beyond available logs', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    const buffer = getBuffer(state, 'repo1')
    for (let i = 0; i < 10; i++) {
      appendLogLine(buffer, createLogLine(`line ${i}`, 'stdout', i))
    }

    scrollUp(state, 1000)

    // Should be clamped to max possible scroll
    const maxScroll = Math.max(0, 10 - getLogAreaHeight(state))
    expect(state.scrollOffset).toBe(maxScroll)
  })
})

describe('scrollDown', () => {
  it('decreases scroll offset', () => {
    const state = createTerminalUIState()
    state.scrollOffset = 10
    state.autoScroll = false

    scrollDown(state, 3)

    expect(state.scrollOffset).toBe(7)
    expect(state.autoScroll).toBe(false)
  })

  it('enables autoScroll when reaching bottom', () => {
    const state = createTerminalUIState()
    state.scrollOffset = 5
    state.autoScroll = false

    scrollDown(state, 5)

    expect(state.scrollOffset).toBe(0)
    expect(state.autoScroll).toBe(true)
  })

  it('does not go below zero', () => {
    const state = createTerminalUIState()
    state.scrollOffset = 2

    scrollDown(state, 10)

    expect(state.scrollOffset).toBe(0)
  })
})

describe('scrollToTop', () => {
  it('scrolls to the top of the log', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    const buffer = getBuffer(state, 'repo1')
    for (let i = 0; i < 100; i++) {
      appendLogLine(buffer, createLogLine(`line ${i}`, 'stdout', i))
    }
    state.scrollOffset = 0

    scrollToTop(state)

    expect(state.scrollOffset).toBeGreaterThan(0)
    expect(state.autoScroll).toBe(false)
  })
})

describe('scrollToBottom', () => {
  it('scrolls to the bottom and enables autoScroll', () => {
    const state = createTerminalUIState()
    state.scrollOffset = 50
    state.autoScroll = false

    scrollToBottom(state)

    expect(state.scrollOffset).toBe(0)
    expect(state.autoScroll).toBe(true)
  })
})

describe('getTabRowCount', () => {
  it('returns 1 when all tabs fit on one row', () => {
    const state = createTerminalUIState()
    updateDimensions(state, 80, 24)

    expect(getTabRowCount(state)).toBe(1)
  })

  it('returns 1 for just the All tab with no repos', () => {
    const state = createTerminalUIState()
    updateDimensions(state, 10, 24)

    expect(getTabRowCount(state)).toBe(1)
  })

  it('returns multiple rows when tabs exceed width', () => {
    const state = createTerminalUIState()
    updateDimensions(state, 20, 24)
    addRepository(state, 'repo-alpha', createLogBuffer())
    addRepository(state, 'repo-beta', createLogBuffer())

    expect(getTabRowCount(state)).toBeGreaterThan(1)
  })

  it('returns 1 for zero width', () => {
    const state = createTerminalUIState()
    updateDimensions(state, 0, 24)

    expect(getTabRowCount(state)).toBe(1)
  })
})

describe('getLogAreaHeight', () => {
  it('calculates available height for logs with single tab row', () => {
    const state = createTerminalUIState()
    state.height = 24

    // 24 - (1 tab row + 3 chrome) = 20
    expect(getLogAreaHeight(state)).toBe(20)
  })

  it('reduces log area when tabs wrap to multiple rows', () => {
    const state = createTerminalUIState()
    updateDimensions(state, 20, 24)
    addRepository(state, 'repo-alpha', createLogBuffer())
    addRepository(state, 'repo-beta', createLogBuffer())

    const tabRows = getTabRowCount(state)
    expect(tabRows).toBeGreaterThan(1)
    // 24 - (tabRows + 3 chrome)
    expect(getLogAreaHeight(state)).toBe(24 - (tabRows + 3))
  })

  it('returns minimum of 1 for very small terminals', () => {
    const state = createTerminalUIState()
    state.height = 3

    expect(getLogAreaHeight(state)).toBe(1)
  })
})

describe('getRepoColor', () => {
  it('returns SYSTEM_COLOR for system repository', () => {
    expect(getRepoColor('system', 0)).toBe(SYSTEM_COLOR)
  })

  it('cycles through REPO_COLORS for non-system repositories', () => {
    expect(getRepoColor('repo1', 0)).toBe(REPO_COLORS[0])
    expect(getRepoColor('repo2', 1)).toBe(REPO_COLORS[1])
  })
})

describe('getVisibleLogs', () => {
  it('returns logs from selected repository', () => {
    const state = createTerminalUIState()
    const buffer1 = createLogBuffer()
    const buffer2 = createLogBuffer()
    appendLogLine(buffer1, createLogLine('log from repo1', 'stdout', 1))
    appendLogLine(buffer2, createLogLine('log from repo2', 'stdout', 2))
    addRepository(state, 'repo1', buffer1)
    addRepository(state, 'repo2', buffer2)
    state.selectedIndex = 0 // repo1

    const logs = getVisibleLogs(state)

    expect(logs.length).toBe(1)
    expect(logs[0].text).toBe('log from repo1')
    expect(logs[0].repository).toBe('repo1')
  })

  it('returns merged logs for "All" view', () => {
    const state = createTerminalUIState()
    const buffer1 = createLogBuffer()
    const buffer2 = createLogBuffer()
    appendLogLine(buffer1, createLogLine('log 1', 'stdout', 100))
    appendLogLine(buffer2, createLogLine('log 2', 'stdout', 50))
    addRepository(state, 'repo1', buffer1)
    addRepository(state, 'repo2', buffer2)
    state.selectedIndex = -1 // "All"

    const logs = getVisibleLogs(state)

    expect(logs.length).toBe(2)
    // Should be sorted by timestamp
    expect(logs[0].text).toBe('log 2')
    expect(logs[1].text).toBe('log 1')
  })

  it('assigns different colors to repositories in "All" view', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    addRepository(state, 'repo2', createLogBuffer())
    appendLogLine(getBuffer(state, 'repo1'), createLogLine('a', 'stdout', 1))
    appendLogLine(getBuffer(state, 'repo2'), createLogLine('b', 'stdout', 2))
    state.selectedIndex = -1

    const logs = getVisibleLogs(state)

    expect(logs[0].color).toBe(REPO_COLORS[0])
    expect(logs[1].color).toBe(REPO_COLORS[1])
  })

  it('returns empty array when selected index is out of range', () => {
    const state = createTerminalUIState()
    state.selectedIndex = 5

    expect(getVisibleLogs(state)).toEqual([])
  })

  it('returns empty array when selected repo has no buffer', () => {
    const state = createTerminalUIState()
    state.repositories.push('ghost')
    state.selectedIndex = 0

    expect(getVisibleLogs(state)).toEqual([])
  })

  it('skips repos with no buffer in "All" view', () => {
    const state = createTerminalUIState()
    const buffer = createLogBuffer()
    appendLogLine(buffer, createLogLine('has buffer', 'stdout', 1))
    addRepository(state, 'repo1', buffer)
    // Add repo without a buffer
    state.repositories.push('no-buffer-repo')
    state.selectedIndex = -1

    const logs = getVisibleLogs(state)

    expect(logs.length).toBe(1)
    expect(logs[0].text).toBe('has buffer')
  })

  it('falls back to white color when repo not in color map', () => {
    const state = createTerminalUIState()
    const buffer = createLogBuffer()
    appendLogLine(buffer, createLogLine('orphan log', 'stdout', 1))
    // Add buffer directly without going through addRepository
    state.logBuffers.set('orphan', buffer)
    // Manually add to repositories array so it iterates but has no color entry
    state.repositories.push('orphan')
    state.selectedIndex = -1

    const logs = getVisibleLogs(state)

    expect(logs.length).toBe(1)
  })
})

describe('renderTabs', () => {
  it('renders "All" tab selected when selectedIndex is -1', () => {
    const state = createTerminalUIState()
    state.selectedIndex = -1

    const rows = renderTabs(state)

    expect(rows.length).toBe(1)
    expect(rows[0]).toContain(ANSI.INVERSE)
    expect(rows[0]).toContain('All')
  })

  it('renders repository tabs with colors', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    state.selectedIndex = 0

    const rows = renderTabs(state)

    const allText = rows.join('')
    expect(allText).toContain('repo1')
    expect(allText).toContain(ANSI.INVERSE) // Selected repo
  })

  it('joins tabs with pipe separator', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    addRepository(state, 'repo2', createLogBuffer())

    const rows = renderTabs(state)

    expect(rows[0]).toContain('|')
  })

  it('wraps tabs to multiple rows when they exceed terminal width', () => {
    const state = createTerminalUIState()
    updateDimensions(state, 30, 24)
    addRepository(state, 'repository-alpha', createLogBuffer())
    addRepository(state, 'repository-beta', createLogBuffer())

    const rows = renderTabs(state)

    expect(rows.length).toBeGreaterThan(1)
    // Each row should contain complete tab text (no broken tabs)
    for (const row of rows) {
      expect(row).not.toMatch(/[^|]\|$/) // no trailing pipe without tab text
    }
  })

  it('keeps all tabs on one row when terminal is wide enough', () => {
    const state = createTerminalUIState()
    updateDimensions(state, 200, 24)
    addRepository(state, 'repo1', createLogBuffer())
    addRepository(state, 'repo2', createLogBuffer())

    const rows = renderTabs(state)

    expect(rows.length).toBe(1)
  })

  it('shows status dot before repository name', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())

    const rows = renderTabs(state)
    const allText = rows.join('')

    expect(allText).toContain(CHARS.dot)
    // Dot should appear before repo name
    const dotIndex = allText.indexOf(CHARS.dot)
    const repoIndex = allText.indexOf('repo1')
    expect(dotIndex).toBeLessThan(repoIndex)
  })

  it('shows dim dot for idle status', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    state.agentStatuses.set('repo1', 'idle')

    const rows = renderTabs(state)
    const allText = rows.join('')

    // Dot should be styled with DIM
    expect(allText).toContain(`${ANSI.DIM}${CHARS.dot}`)
  })

  it('shows dim dot when agent status is undefined', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    // Remove the agent status entry to test the fallback
    state.agentStatuses.delete('repo1')

    const rows = renderTabs(state)
    const allText = rows.join('')

    // Dot should default to DIM when status is undefined
    expect(allText).toContain(`${ANSI.DIM}${CHARS.dot}`)
  })

  it('shows green dot for busy status', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    state.agentStatuses.set('repo1', 'busy')

    const rows = renderTabs(state)
    const allText = rows.join('')

    // Dot should be styled with FG_GREEN
    expect(allText).toContain(`${ANSI.FG_GREEN}${CHARS.dot}`)
  })

  it('does not show dot on the All tab', () => {
    const state = createTerminalUIState()
    state.selectedIndex = -1

    const rows = renderTabs(state)

    // "All" tab should not have a dot
    const allTabText = rows[0].split('|')[0] // Get just the "All" tab portion
    expect(allTabText).not.toContain(CHARS.dot)
  })

  it('accounts for dot width in tab wrapping calculation', () => {
    const state = createTerminalUIState()
    // Set width that would fit tabs without dots but not with dots
    // Without dots: " All " = 5, " repo1 " = 7, separator = 1 => total = 13
    // With dots: " All " = 5, " ● repo1 " = 9, separator = 1 => total = 15
    // Width 13 would fit without dots but not with dots
    updateDimensions(state, 13, 24)
    addRepository(state, 'repo1', createLogBuffer())

    const rows = renderTabs(state)

    // Should wrap to multiple rows because dot adds 2 chars
    expect(rows.length).toBe(2)
  })
})

describe('renderHelpLine', () => {
  it('contains key bindings', () => {
    const help = renderHelpLine()

    expect(help).toContain(CHARS.arrows_lr)
    expect(help).toContain(CHARS.arrows_ud)
    expect(help).toContain('q')
    expect(help).toContain('select')
    expect(help).toContain('scroll')
    expect(help).toContain('quit')
  })

  it('contains open shortcut', () => {
    const help = renderHelpLine()

    expect(help).toContain('[o] open')
  })
})

describe('renderSeparator', () => {
  it('renders a horizontal line of specified width', () => {
    const sep = renderSeparator(10)

    expect(sep).toBe(CHARS.hline.repeat(10))
    expect(sep.length).toBe(10)
  })
})

describe('formatLogLine', () => {
  it('formats log line without prefix when prefixAlign is 0', () => {
    const line = {
      text: 'test log',
      stream: 'stdout' as const,
      timestamp: 1000,
      repository: 'repo1',
      color: ANSI.FG_CYAN,
    }

    const formatted = formatLogLine(line, 0, 80)

    expect(formatted).toBe('test log')
    expect(formatted).not.toContain('repo1')
  })

  it('formats log line with right-padded prefix and pipe delimiter', () => {
    const line = {
      text: 'test log',
      stream: 'stdout' as const,
      timestamp: 1000,
      repository: 'repo1',
      color: ANSI.FG_CYAN,
    }

    const formatted = formatLogLine(line, 10, 80)

    expect(formatted).toContain('repo1')
    expect(formatted).toContain('|')
    expect(formatted).toContain('test log')
    expect(formatted).toContain(ANSI.FG_CYAN)
    // "repo1" (5) + 5 padding + " | " = 13 prefix chars + "test log" = 21
    expect(visibleLength(formatted)).toBe(21)
  })

  it('colors stderr lines red', () => {
    const line = {
      text: 'error message',
      stream: 'stderr' as const,
      timestamp: 1000,
      repository: 'repo1',
      color: ANSI.FG_CYAN,
    }

    const formatted = formatLogLine(line, 0, 80)

    expect(formatted).toContain(ANSI.FG_RED)
  })

  it('truncates long lines', () => {
    const line = {
      text: 'this is a very long line that should be truncated',
      stream: 'stdout' as const,
      timestamp: 1000,
      repository: 'repo1',
      color: ANSI.FG_CYAN,
    }

    const formatted = formatLogLine(line, 0, 20)

    expect(visibleLength(formatted)).toBe(20)
  })

  it('strips newlines from text to guarantee single-line output', () => {
    const line = {
      text: 'message with trailing newline\n',
      stream: 'stdout' as const,
      timestamp: 1000,
      repository: 'repo1',
      color: ANSI.FG_CYAN,
    }

    const formatted = formatLogLine(line, 0, 80)

    expect(formatted).not.toContain('\n')
    expect(formatted).toBe('message with trailing newline')
  })

  it('returns only prefix when available width is zero or negative', () => {
    const line = {
      text: 'text that will not fit',
      stream: 'stdout' as const,
      timestamp: 1000,
      repository: 'repo1',
      color: ANSI.FG_CYAN,
    }

    // prefixAlign=10 means prefix is 13 chars (10 + " | ")
    // maxWidth=13 leaves 0 available for text
    const formatted = formatLogLine(line, 10, 13)

    expect(formatted).toContain('repo1')
    expect(formatted).not.toContain('text that will not fit')
  })

  it('prepends HH:MM:SS timestamp for system log lines', () => {
    const ts = new Date(2025, 0, 1, 14, 5, 9).getTime()
    const line = {
      text: 'Connected to dustbucket',
      stream: 'stdout' as const,
      timestamp: ts,
      repository: 'system',
      color: ANSI.DIM,
    }

    const formatted = formatLogLine(line, 0, 80)

    expect(formatted).toContain('14:05:09')
    expect(formatted).toContain('Connected to dustbucket')
  })

  it('does not add timestamp for non-system log lines', () => {
    const line = {
      text: 'some output',
      stream: 'stdout' as const,
      timestamp: Date.now(),
      repository: 'owner/repo',
      color: ANSI.FG_CYAN,
    }

    const formatted = formatLogLine(line, 0, 80)

    // Should not contain a time pattern
    expect(formatted).toBe('some output')
  })
})

describe('renderFrame', () => {
  it('renders complete frame with all components', () => {
    const state = createTerminalUIState()
    updateDimensions(state, 100, 24) // Wide enough to show full help line
    addRepository(state, 'repo1', createLogBuffer())
    appendLogLine(
      getBuffer(state, 'repo1'),
      createLogLine('test log', 'stdout', 1)
    )

    const frame = renderFrame(state)

    expect(frame).toContain(`${CHARS.sparkle}dust bucket`)
    expect(frame).toContain('All')
    expect(frame).toContain('repo1')
    expect(frame).toContain('select')
    expect(frame).toContain('quit')
    expect(frame).toContain(CHARS.hline)
  })

  it('shows connected host in header', () => {
    const state = createTerminalUIState()
    updateDimensions(state, 80, 24)
    state.connectedHost = 'dustbucket.com'

    const frame = renderFrame(state)

    expect(frame).toContain(`${CHARS.sparkle}dust bucket`)
    expect(frame).toContain('connected to dustbucket.com')
  })

  it('shows scroll indicator when scrolled up', () => {
    const state = createTerminalUIState()
    updateDimensions(state, 80, 24)
    addRepository(state, 'repo1', createLogBuffer())
    // Add many logs
    for (let i = 0; i < 100; i++) {
      appendLogLine(
        getBuffer(state, 'repo1'),
        createLogLine(`line ${i}`, 'stdout', i)
      )
    }
    state.scrollOffset = 10

    const frame = renderFrame(state)

    expect(frame).toContain('more')
    expect(frame).toContain(CHARS.scroll_down)
  })

  it('renders single repository view without repo prefix', () => {
    const state = createTerminalUIState()
    updateDimensions(state, 80, 24)
    addRepository(state, 'repo1', createLogBuffer())
    appendLogLine(
      getBuffer(state, 'repo1'),
      createLogLine('single view log', 'stdout', 1)
    )
    state.selectedIndex = 0

    const frame = renderFrame(state)

    expect(frame).toContain('single view log')
  })
})

describe('enterAlternateScreen', () => {
  it('returns correct escape sequences', () => {
    const sequence = enterAlternateScreen()

    expect(sequence).toContain(ANSI.ENTER_ALT_SCREEN)
    expect(sequence).toContain(ANSI.HIDE_CURSOR)
    expect(sequence).toContain(ANSI.CLEAR_SCREEN)
  })
})

describe('exitAlternateScreen', () => {
  it('returns correct escape sequences', () => {
    const sequence = exitAlternateScreen()

    expect(sequence).toContain(ANSI.EXIT_ALT_SCREEN)
    expect(sequence).toContain(ANSI.SHOW_CURSOR)
  })
})

describe('handleKeyInput', () => {
  it('returns true for quit keys', () => {
    const state = createTerminalUIState()

    expect(handleKeyInput(state, 'q')).toBe(true)
    expect(handleKeyInput(state, KEYS.CTRL_C)).toBe(true)
  })

  it('returns false for navigation keys', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())

    expect(handleKeyInput(state, KEYS.LEFT)).toBe(false)
    expect(handleKeyInput(state, KEYS.RIGHT)).toBe(false)
    expect(handleKeyInput(state, KEYS.UP)).toBe(false)
    expect(handleKeyInput(state, KEYS.DOWN)).toBe(false)
  })

  it('handles left/right arrow keys', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    addRepository(state, 'repo2', createLogBuffer())
    state.selectedIndex = -1

    handleKeyInput(state, KEYS.RIGHT)
    expect(state.selectedIndex).toBe(0)

    handleKeyInput(state, KEYS.LEFT)
    expect(state.selectedIndex).toBe(-1)
  })

  it('resets scroll when changing selection', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    state.scrollOffset = 10
    state.autoScroll = false

    handleKeyInput(state, KEYS.RIGHT)

    expect(state.scrollOffset).toBe(0)
    expect(state.autoScroll).toBe(true)
  })

  it('handles up/down arrow keys for scrolling', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    for (let i = 0; i < 100; i++) {
      appendLogLine(
        getBuffer(state, 'repo1'),
        createLogLine(`line ${i}`, 'stdout', i)
      )
    }

    handleKeyInput(state, KEYS.UP)
    expect(state.scrollOffset).toBe(1)

    handleKeyInput(state, KEYS.DOWN)
    expect(state.scrollOffset).toBe(0)
  })

  it('handles page up/down keys', () => {
    const state = createTerminalUIState()
    updateDimensions(state, 80, 24)
    addRepository(state, 'repo1', createLogBuffer())
    for (let i = 0; i < 100; i++) {
      appendLogLine(
        getBuffer(state, 'repo1'),
        createLogLine(`line ${i}`, 'stdout', i)
      )
    }

    handleKeyInput(state, KEYS.PAGE_UP)
    const pageHeight = getLogAreaHeight(state)
    expect(state.scrollOffset).toBe(pageHeight)

    handleKeyInput(state, KEYS.PAGE_DOWN)
    expect(state.scrollOffset).toBe(0)
  })

  it('handles g/G keys for top/bottom', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    for (let i = 0; i < 100; i++) {
      appendLogLine(
        getBuffer(state, 'repo1'),
        createLogLine(`line ${i}`, 'stdout', i)
      )
    }

    handleKeyInput(state, 'g')
    expect(state.scrollOffset).toBeGreaterThan(0)

    handleKeyInput(state, 'G')
    expect(state.scrollOffset).toBe(0)
  })

  it('handles Home/End keys for top/bottom', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    for (let i = 0; i < 100; i++) {
      appendLogLine(
        getBuffer(state, 'repo1'),
        createLogLine(`line ${i}`, 'stdout', i)
      )
    }

    handleKeyInput(state, KEYS.HOME)
    expect(state.scrollOffset).toBeGreaterThan(0)

    handleKeyInput(state, KEYS.END)
    expect(state.scrollOffset).toBe(0)
  })

  it('ignores unknown keys', () => {
    const state = createTerminalUIState()
    const initialIndex = state.selectedIndex
    const initialScroll = state.scrollOffset

    const result = handleKeyInput(state, 'x')

    expect(result).toBe(false)
    expect(state.selectedIndex).toBe(initialIndex)
    expect(state.scrollOffset).toBe(initialScroll)
  })

  it('scrolls up on mouse wheel up (SGR button 64)', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    for (let i = 0; i < 100; i++) {
      appendLogLine(
        getBuffer(state, 'repo1'),
        createLogLine(`line ${i}`, 'stdout', i)
      )
    }

    const result = handleKeyInput(state, '\x1b[<64;10;5M')

    expect(result).toBe(false)
    expect(state.scrollOffset).toBe(3)
  })

  it('scrolls down on mouse wheel down (SGR button 65)', () => {
    const state = createTerminalUIState()
    state.scrollOffset = 10
    state.autoScroll = false

    const result = handleKeyInput(state, '\x1b[<65;10;5M')

    expect(result).toBe(false)
    expect(state.scrollOffset).toBe(7)
  })

  it('ignores non-scroll mouse events', () => {
    const state = createTerminalUIState()
    const initialScroll = state.scrollOffset

    const result = handleKeyInput(state, '\x1b[<0;10;5M')

    expect(result).toBe(false)
    expect(state.scrollOffset).toBe(initialScroll)
  })

  it('opens repository URL when pressing o on a repo with URL', () => {
    const state = createTerminalUIState()
    addRepository(
      state,
      'repo1',
      createLogBuffer(),
      'https://github.com/user/repo1'
    )
    state.selectedIndex = 0

    let openedUrl: string | undefined
    const result = handleKeyInput(state, 'o', {
      openBrowser: url => {
        openedUrl = url
      },
    })

    expect(result).toBe(false)
    expect(openedUrl).toBe('https://github.com/user/repo1')
  })

  it('does nothing when pressing o on the All tab', () => {
    const state = createTerminalUIState()
    addRepository(
      state,
      'repo1',
      createLogBuffer(),
      'https://github.com/user/repo1'
    )
    state.selectedIndex = -1 // "All" tab

    let openedUrl: string | undefined
    const result = handleKeyInput(state, 'o', {
      openBrowser: url => {
        openedUrl = url
      },
    })

    expect(result).toBe(false)
    expect(openedUrl).toBeUndefined()
  })

  it('does nothing when pressing o on a repo without URL', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer()) // No URL
    state.selectedIndex = 0

    let openedUrl: string | undefined
    const result = handleKeyInput(state, 'o', {
      openBrowser: url => {
        openedUrl = url
      },
    })

    expect(result).toBe(false)
    expect(openedUrl).toBeUndefined()
  })

  it('does nothing when pressing o without openBrowser callback', () => {
    const state = createTerminalUIState()
    addRepository(
      state,
      'repo1',
      createLogBuffer(),
      'https://github.com/user/repo1'
    )
    state.selectedIndex = 0

    // Should not throw
    const result = handleKeyInput(state, 'o')

    expect(result).toBe(false)
  })

  it('does nothing when pressing o with selectedIndex out of range', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    state.selectedIndex = 5 // Out of range

    let openedUrl: string | undefined
    const result = handleKeyInput(state, 'o', {
      openBrowser: url => {
        openedUrl = url
      },
    })

    expect(result).toBe(false)
    expect(openedUrl).toBeUndefined()
  })
})

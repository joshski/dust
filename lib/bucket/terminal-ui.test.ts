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
  createTerminalUIState,
  enterAlternateScreen,
  exitAlternateScreen,
  formatLogLine,
  getLogAreaHeight,
  getVisibleLogs,
  handleKeyInput,
  KEYS,
  REPO_COLORS,
  removeRepository,
  renderFrame,
  renderHelpLine,
  renderSeparator,
  renderTabs,
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
    expect(truncateLine('hello world', 5)).toBe(`hell…${ANSI.RESET}`)
    expect(truncateLine('abcdef', 3)).toBe(`ab…${ANSI.RESET}`)
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
})

describe('createTerminalUIState', () => {
  it('creates initial state with defaults', () => {
    const state = createTerminalUIState()
    expect(state.repositories).toEqual([])
    expect(state.selectedIndex).toBe(-1) // "All" selected by default
    expect(state.logBuffers.size).toBe(0)
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

  it('maintains alphabetical order', () => {
    const state = createTerminalUIState()

    addRepository(state, 'zebra', createLogBuffer())
    addRepository(state, 'alpha', createLogBuffer())
    addRepository(state, 'middle', createLogBuffer())

    expect(state.repositories).toEqual(['alpha', 'middle', 'zebra'])
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

describe('getLogAreaHeight', () => {
  it('calculates available height for logs', () => {
    const state = createTerminalUIState()
    state.height = 24

    // 24 - 4 (header, tabs, help, separator) = 20
    expect(getLogAreaHeight(state)).toBe(20)
  })

  it('returns minimum of 1 for very small terminals', () => {
    const state = createTerminalUIState()
    state.height = 3

    expect(getLogAreaHeight(state)).toBe(1)
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
})

describe('renderTabs', () => {
  it('renders "All" tab selected when selectedIndex is -1', () => {
    const state = createTerminalUIState()
    state.selectedIndex = -1

    const tabs = renderTabs(state)

    expect(tabs).toContain(ANSI.INVERSE)
    expect(tabs).toContain('All')
  })

  it('renders repository tabs with colors', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    state.selectedIndex = 0

    const tabs = renderTabs(state)

    expect(tabs).toContain('repo1')
    expect(tabs).toContain(ANSI.INVERSE) // Selected repo
  })

  it('joins tabs with pipe separator', () => {
    const state = createTerminalUIState()
    addRepository(state, 'repo1', createLogBuffer())
    addRepository(state, 'repo2', createLogBuffer())

    const tabs = renderTabs(state)

    expect(tabs).toContain('|')
  })
})

describe('renderHelpLine', () => {
  it('contains key bindings', () => {
    const help = renderHelpLine()

    expect(help).toContain('←→')
    expect(help).toContain('↑↓')
    expect(help).toContain('q')
    expect(help).toContain('select')
    expect(help).toContain('scroll')
    expect(help).toContain('quit')
  })
})

describe('renderSeparator', () => {
  it('renders a horizontal line of specified width', () => {
    const sep = renderSeparator(10)

    expect(sep).toBe('──────────')
    expect(sep.length).toBe(10)
  })
})

describe('formatLogLine', () => {
  it('formats log line without prefix', () => {
    const line = {
      text: 'test log',
      stream: 'stdout' as const,
      timestamp: 1000,
      repository: 'repo1',
      color: ANSI.FG_CYAN,
    }

    const formatted = formatLogLine(line, false, 80)

    expect(formatted).toBe('test log')
    expect(formatted).not.toContain('[repo1]')
  })

  it('formats log line with prefix', () => {
    const line = {
      text: 'test log',
      stream: 'stdout' as const,
      timestamp: 1000,
      repository: 'repo1',
      color: ANSI.FG_CYAN,
    }

    const formatted = formatLogLine(line, true, 80)

    expect(formatted).toContain('[repo1]')
    expect(formatted).toContain('test log')
    expect(formatted).toContain(ANSI.FG_CYAN)
  })

  it('colors stderr lines red', () => {
    const line = {
      text: 'error message',
      stream: 'stderr' as const,
      timestamp: 1000,
      repository: 'repo1',
      color: ANSI.FG_CYAN,
    }

    const formatted = formatLogLine(line, false, 80)

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

    const formatted = formatLogLine(line, false, 20)

    expect(visibleLength(formatted)).toBe(20)
  })
})

describe('renderFrame', () => {
  it('renders complete frame with all components', () => {
    const state = createTerminalUIState()
    updateDimensions(state, 80, 24)
    addRepository(state, 'repo1', createLogBuffer())
    appendLogLine(
      getBuffer(state, 'repo1'),
      createLogLine('test log', 'stdout', 1)
    )

    const frame = renderFrame(state)

    expect(frame).toContain('connected to dustbucket.com')
    expect(frame).toContain('All')
    expect(frame).toContain('repo1')
    expect(frame).toContain('select')
    expect(frame).toContain('quit')
    expect(frame).toContain('─')
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
    expect(frame).toContain('↓')
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
})

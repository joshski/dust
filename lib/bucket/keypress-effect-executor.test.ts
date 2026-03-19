import { describe, expect, it } from 'vitest'
import type { Effect } from './bucket-state'
import {
  executeKeypressEffects,
  type UIEffectTarget,
} from './keypress-effect-executor'

/**
 * Stub implementation of UIEffectTarget that records all operations.
 */
interface UIEffectTargetStub extends UIEffectTarget {
  calls: string[]
  logAreaHeight: number
}

function createUIEffectTargetStub(logAreaHeight = 20): UIEffectTargetStub {
  const calls: string[] = []
  return {
    calls,
    logAreaHeight,
    selectNext() {
      calls.push('selectNext')
    },
    selectPrevious() {
      calls.push('selectPrevious')
    },
    resetScroll() {
      calls.push('resetScroll')
    },
    scrollUp(lines: number) {
      calls.push(`scrollUp(${lines})`)
    },
    scrollDown(lines: number) {
      calls.push(`scrollDown(${lines})`)
    },
    scrollToTop() {
      calls.push('scrollToTop')
    },
    scrollToBottom() {
      calls.push('scrollToBottom')
    },
    getLogAreaHeight() {
      return this.logAreaHeight
    },
  }
}

describe('executeKeypressEffects', () => {
  describe('quit effect', () => {
    it('calls onQuit when quit effect is received', () => {
      const target = createUIEffectTargetStub()
      const effects: Effect[] = [{ type: 'quit' }]
      let quitCalled = false

      executeKeypressEffects(target, effects, () => {
        quitCalled = true
      })

      expect(quitCalled).toBe(true)
      expect(target.calls).toEqual([])
    })
  })

  describe('openBrowser effect', () => {
    it('calls openBrowser callback with URL when provided', () => {
      const target = createUIEffectTargetStub()
      const effects: Effect[] = [
        { type: 'openBrowser', url: 'https://example.com' },
      ]
      let openedUrl: string | undefined

      executeKeypressEffects(target, effects, () => {}, {
        openBrowser: url => {
          openedUrl = url
        },
      })

      expect(openedUrl).toBe('https://example.com')
      expect(target.calls).toEqual([])
    })

    it('does nothing when openBrowser callback is not provided', () => {
      const target = createUIEffectTargetStub()
      const effects: Effect[] = [
        { type: 'openBrowser', url: 'https://example.com' },
      ]

      executeKeypressEffects(target, effects, () => {})

      expect(target.calls).toEqual([])
    })
  })

  describe('navigation effects', () => {
    it('selects next and resets scroll for selectNext effect', () => {
      const target = createUIEffectTargetStub()
      const effects: Effect[] = [{ type: 'selectNext' }]

      executeKeypressEffects(target, effects, () => {})

      expect(target.calls).toEqual(['selectNext', 'resetScroll'])
    })

    it('selects previous and resets scroll for selectPrevious effect', () => {
      const target = createUIEffectTargetStub()
      const effects: Effect[] = [{ type: 'selectPrevious' }]

      executeKeypressEffects(target, effects, () => {})

      expect(target.calls).toEqual(['selectPrevious', 'resetScroll'])
    })
  })

  describe('scroll effects', () => {
    it('scrolls up by 1 line for scroll up effect', () => {
      const target = createUIEffectTargetStub()
      const effects: Effect[] = [{ type: 'scroll', direction: 'up' }]

      executeKeypressEffects(target, effects, () => {})

      expect(target.calls).toEqual(['scrollUp(1)'])
    })

    it('scrolls down by 1 line for scroll down effect', () => {
      const target = createUIEffectTargetStub()
      const effects: Effect[] = [{ type: 'scroll', direction: 'down' }]

      executeKeypressEffects(target, effects, () => {})

      expect(target.calls).toEqual(['scrollDown(1)'])
    })

    it('scrolls up by page height for pageUp effect', () => {
      const target = createUIEffectTargetStub(15)
      const effects: Effect[] = [{ type: 'scroll', direction: 'pageUp' }]

      executeKeypressEffects(target, effects, () => {})

      expect(target.calls).toEqual(['scrollUp(15)'])
    })

    it('scrolls down by page height for pageDown effect', () => {
      const target = createUIEffectTargetStub(25)
      const effects: Effect[] = [{ type: 'scroll', direction: 'pageDown' }]

      executeKeypressEffects(target, effects, () => {})

      expect(target.calls).toEqual(['scrollDown(25)'])
    })

    it('scrolls to top for top effect', () => {
      const target = createUIEffectTargetStub()
      const effects: Effect[] = [{ type: 'scroll', direction: 'top' }]

      executeKeypressEffects(target, effects, () => {})

      expect(target.calls).toEqual(['scrollToTop'])
    })

    it('scrolls to bottom for bottom effect', () => {
      const target = createUIEffectTargetStub()
      const effects: Effect[] = [{ type: 'scroll', direction: 'bottom' }]

      executeKeypressEffects(target, effects, () => {})

      expect(target.calls).toEqual(['scrollToBottom'])
    })
  })

  describe('multiple effects', () => {
    it('executes multiple effects in order', () => {
      const target = createUIEffectTargetStub()
      const effects: Effect[] = [
        { type: 'scroll', direction: 'up' },
        { type: 'scroll', direction: 'up' },
        { type: 'scroll', direction: 'up' },
      ]

      executeKeypressEffects(target, effects, () => {})

      expect(target.calls).toEqual([
        'scrollUp(1)',
        'scrollUp(1)',
        'scrollUp(1)',
      ])
    })
  })

  describe('non-keypress effects', () => {
    it('ignores effects that are not keypress-related', () => {
      const target = createUIEffectTargetStub()
      const effects: Effect[] = [
        { type: 'log', message: 'test', stream: 'stdout' },
        { type: 'syncUI', repositories: [] },
        { type: 'handleRepositoryList', repositories: [] },
      ]

      executeKeypressEffects(target, effects, () => {})

      expect(target.calls).toEqual([])
    })
  })
})

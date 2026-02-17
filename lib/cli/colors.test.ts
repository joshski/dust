import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { restoreEnv, stubEnv } from '../test/test-utilities'
import { getColors, shouldDisableColors } from './colors'

describe('colors', () => {
  const originalIsTTY = process.stdout.isTTY

  function withColorFriendlyEnv<T>(
    callback: () => T | Promise<T>
  ): T | Promise<T> {
    return stubEnv('NO_COLOR', undefined, () =>
      stubEnv('TERM', 'xterm-256color', callback)
    )
  }

  beforeEach(() => {
    ;(process.stdout as unknown as { isTTY: boolean }).isTTY = true
  })

  afterEach(() => {
    restoreEnv()
    ;(process.stdout as unknown as { isTTY: boolean | undefined }).isTTY =
      originalIsTTY
  })

  describe('shouldDisableColors', () => {
    it('returns false when in a TTY without special environment variables', () => {
      withColorFriendlyEnv(() => {
        expect(shouldDisableColors()).toBe(false)
      })
    })

    it('returns true when NO_COLOR is set', () => {
      stubEnv('NO_COLOR', '1')
      expect(shouldDisableColors()).toBe(true)
    })

    it('returns true when NO_COLOR is empty string (still set)', () => {
      stubEnv('NO_COLOR', '')
      expect(shouldDisableColors()).toBe(true)
    })

    it('returns true when TERM is dumb', () => {
      withColorFriendlyEnv(() => {
        stubEnv('TERM', 'dumb')
        expect(shouldDisableColors()).toBe(true)
      })
    })

    it('returns true when stdout is not a TTY', () => {
      withColorFriendlyEnv(() => {
        ;(process.stdout as unknown as { isTTY: boolean }).isTTY = false
        expect(shouldDisableColors()).toBe(true)
      })
    })

    it('returns true when stdout.isTTY is undefined', () => {
      withColorFriendlyEnv(() => {
        ;(process.stdout as unknown as { isTTY: undefined }).isTTY = undefined
        expect(shouldDisableColors()).toBe(true)
      })
    })
  })

  describe('getColors', () => {
    it('returns ANSI colors when in a TTY', () => {
      withColorFriendlyEnv(() => {
        const colors = getColors()
        expect(colors.reset).toBe('\x1b[0m')
        expect(colors.bold).toBe('\x1b[1m')
        expect(colors.dim).toBe('\x1b[2m')
        expect(colors.cyan).toBe('\x1b[36m')
      })
    })

    it('returns empty strings when NO_COLOR is set', () => {
      stubEnv('NO_COLOR', '1')
      const colors = getColors()
      expect(colors.reset).toBe('')
      expect(colors.bold).toBe('')
      expect(colors.dim).toBe('')
      expect(colors.cyan).toBe('')
    })

    it('returns empty strings when TERM is dumb', () => {
      withColorFriendlyEnv(() => {
        stubEnv('TERM', 'dumb')
        const colors = getColors()
        expect(colors.reset).toBe('')
        expect(colors.bold).toBe('')
        expect(colors.dim).toBe('')
        expect(colors.cyan).toBe('')
      })
    })

    it('returns empty strings when stdout is not a TTY', () => {
      withColorFriendlyEnv(() => {
        ;(process.stdout as unknown as { isTTY: boolean }).isTTY = false
        const colors = getColors()
        expect(colors.reset).toBe('')
        expect(colors.bold).toBe('')
        expect(colors.dim).toBe('')
        expect(colors.cyan).toBe('')
      })
    })
  })
})

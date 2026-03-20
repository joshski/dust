import { describe, expect, test } from 'vitest'
import {
  createHelperTokenState,
  generateHelperToken,
  HELPER_TOKEN_TTL_MS,
  isCurrentTokenValid,
  isHelperTokenValid,
  rotateHelperToken,
} from './helper-token'

describe('generateHelperToken', () => {
  test('produces token with sk-ant-api03- prefix', () => {
    const result = generateHelperToken()
    expect(result.token).toMatch(/^sk-ant-api03-/)
  })

  test('produces token with correct total length', () => {
    const result = generateHelperToken()
    // sk-ant-api03- (13 chars) + 56 hex chars = 69 chars
    expect(result.token).toHaveLength(69)
  })

  test('produces token with hex characters after prefix', () => {
    const result = generateHelperToken()
    const suffix = result.token.slice(13) // Remove sk-ant-api03- prefix
    expect(suffix).toMatch(/^[0-9a-f]{56}$/)
  })

  test('records issue time', () => {
    const now = 1700000000000
    const result = generateHelperToken(now)
    expect(result.issuedAt).toBe(now)
  })

  test('uses current time by default', () => {
    const before = Date.now()
    const result = generateHelperToken()
    const after = Date.now()
    expect(result.issuedAt).toBeGreaterThanOrEqual(before)
    expect(result.issuedAt).toBeLessThanOrEqual(after)
  })

  test('produces unique tokens on successive calls', () => {
    const token1 = generateHelperToken()
    const token2 = generateHelperToken()
    expect(token1.token).not.toBe(token2.token)
  })
})

describe('isHelperTokenValid', () => {
  test('returns true for matching token within TTL', () => {
    const now = 1700000000000
    const issued = generateHelperToken(now)
    const checkTime = now + 30_000 // 30 seconds later
    expect(isHelperTokenValid(issued.token, issued, checkTime)).toBe(true)
  })

  test('returns true for matching token at exact issue time', () => {
    const now = 1700000000000
    const issued = generateHelperToken(now)
    expect(isHelperTokenValid(issued.token, issued, now)).toBe(true)
  })

  test('returns true for matching token just before TTL expires', () => {
    const now = 1700000000000
    const issued = generateHelperToken(now)
    const checkTime = now + HELPER_TOKEN_TTL_MS - 1
    expect(isHelperTokenValid(issued.token, issued, checkTime)).toBe(true)
  })

  test('returns false for matching token at exactly TTL', () => {
    const now = 1700000000000
    const issued = generateHelperToken(now)
    const checkTime = now + HELPER_TOKEN_TTL_MS
    expect(isHelperTokenValid(issued.token, issued, checkTime)).toBe(false)
  })

  test('returns false for matching token after TTL expires', () => {
    const now = 1700000000000
    const issued = generateHelperToken(now)
    const checkTime = now + HELPER_TOKEN_TTL_MS + 1000
    expect(isHelperTokenValid(issued.token, issued, checkTime)).toBe(false)
  })

  test('returns false for wrong token', () => {
    const now = 1700000000000
    const issued = generateHelperToken(now)
    expect(isHelperTokenValid('wrong-token', issued, now)).toBe(false)
  })

  test('returns false for token from different generation', () => {
    const now = 1700000000000
    const issued1 = generateHelperToken(now)
    const issued2 = generateHelperToken(now)
    expect(isHelperTokenValid(issued1.token, issued2, now)).toBe(false)
  })

  test('returns false for check time before issue time', () => {
    const now = 1700000000000
    const issued = generateHelperToken(now)
    const checkTime = now - 1000 // 1 second before issue
    expect(isHelperTokenValid(issued.token, issued, checkTime)).toBe(false)
  })

  test('respects custom TTL parameter', () => {
    const now = 1700000000000
    const issued = generateHelperToken(now)
    const customTtl = 5000 // 5 seconds

    // Within custom TTL
    expect(
      isHelperTokenValid(issued.token, issued, now + 4999, customTtl)
    ).toBe(true)

    // At custom TTL boundary
    expect(
      isHelperTokenValid(issued.token, issued, now + 5000, customTtl)
    ).toBe(false)
  })
})

describe('createHelperTokenState', () => {
  test('creates state with null current token', () => {
    const state = createHelperTokenState()
    expect(state.current).toBeNull()
  })

  test('creates independent state objects', () => {
    const state1 = createHelperTokenState()
    const state2 = createHelperTokenState()
    expect(state1).not.toBe(state2)
  })
})

describe('rotateHelperToken', () => {
  test('produces new state with current token', () => {
    const state = createHelperTokenState()
    const rotated = rotateHelperToken(state)
    expect(rotated.current).not.toBeNull()
  })

  test('produces token with correct format', () => {
    const state = createHelperTokenState()
    const rotated = rotateHelperToken(state)
    expect(rotated.current?.token).toMatch(/^sk-ant-api03-[0-9a-f]{56}$/)
  })

  test('records issue time on rotation', () => {
    const now = 1700000000000
    const state = createHelperTokenState()
    const rotated = rotateHelperToken(state, now)
    expect(rotated.current?.issuedAt).toBe(now)
  })

  test('does not mutate original state', () => {
    const state = createHelperTokenState()
    const rotated = rotateHelperToken(state)
    expect(state.current).toBeNull()
    expect(rotated.current).not.toBeNull()
  })

  test('produces new token on each rotation', () => {
    const state = createHelperTokenState()
    const rotated1 = rotateHelperToken(state)
    const rotated2 = rotateHelperToken(rotated1)
    expect(rotated1.current?.token).not.toBe(rotated2.current?.token)
  })

  test('replaces expired token with fresh one', () => {
    const now = 1700000000000
    const state = createHelperTokenState()
    const rotated1 = rotateHelperToken(state, now)

    // Simulate time passing beyond TTL
    const laterTime = now + HELPER_TOKEN_TTL_MS + 1000
    const rotated2 = rotateHelperToken(rotated1, laterTime)

    expect(rotated2.current?.issuedAt).toBe(laterTime)
    expect(rotated2.current?.token).not.toBe(rotated1.current?.token)
  })
})

describe('isCurrentTokenValid', () => {
  test('returns false for state with no token', () => {
    const state = createHelperTokenState()
    expect(isCurrentTokenValid(state)).toBe(false)
  })

  test('returns true for state with fresh token', () => {
    const now = 1700000000000
    const state = rotateHelperToken(createHelperTokenState(), now)
    expect(isCurrentTokenValid(state, now)).toBe(true)
  })

  test('returns true for token within TTL', () => {
    const now = 1700000000000
    const state = rotateHelperToken(createHelperTokenState(), now)
    const checkTime = now + 30_000 // 30 seconds later
    expect(isCurrentTokenValid(state, checkTime)).toBe(true)
  })

  test('returns false for expired token', () => {
    const now = 1700000000000
    const state = rotateHelperToken(createHelperTokenState(), now)
    const checkTime = now + HELPER_TOKEN_TTL_MS + 1000
    expect(isCurrentTokenValid(state, checkTime)).toBe(false)
  })

  test('respects custom TTL parameter', () => {
    const now = 1700000000000
    const state = rotateHelperToken(createHelperTokenState(), now)
    const customTtl = 5000 // 5 seconds

    expect(isCurrentTokenValid(state, now + 4000, customTtl)).toBe(true)
    expect(isCurrentTokenValid(state, now + 6000, customTtl)).toBe(false)
  })
})

describe('HELPER_TOKEN_TTL_MS', () => {
  test('is 60 seconds', () => {
    expect(HELPER_TOKEN_TTL_MS).toBe(60_000)
  })
})

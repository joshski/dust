import { describe, expect, test } from 'vitest'
import {
  buildUnattendedEnv,
  DUST_PROXY_PORT,
  DUST_REPOSITORY_ID,
  DUST_SKIP_AGENT,
  DUST_UNATTENDED,
  isUnattended,
} from './session'
import { stubEnv } from './test/test-utilities'

describe('isUnattended', () => {
  test('returns false when DUST_UNATTENDED is not set', () => {
    expect(isUnattended({})).toBe(false)
  })

  test('returns true when DUST_UNATTENDED is set', () => {
    expect(isUnattended({ [DUST_UNATTENDED]: '1' })).toBe(true)
  })

  test('returns false when DUST_UNATTENDED is undefined', () => {
    expect(isUnattended({ [DUST_UNATTENDED]: undefined })).toBe(false)
  })
})

describe('buildUnattendedEnv', () => {
  test('returns DUST_UNATTENDED and DUST_SKIP_AGENT', () => {
    const env = buildUnattendedEnv()
    expect(env).toEqual({
      [DUST_UNATTENDED]: '1',
      [DUST_SKIP_AGENT]: '1',
    })
  })

  test('includes DUST_REPOSITORY_ID when provided', () => {
    const env = buildUnattendedEnv({ repositoryId: 'repo-123' })
    expect(env).toEqual({
      [DUST_UNATTENDED]: '1',
      [DUST_SKIP_AGENT]: '1',
      [DUST_REPOSITORY_ID]: 'repo-123',
    })
  })

  test('omits DUST_REPOSITORY_ID when not provided', () => {
    const env = buildUnattendedEnv({})
    expect(env[DUST_REPOSITORY_ID]).toBeUndefined()
  })

  test('includes DUST_PROXY_PORT when present in process env', () => {
    return stubEnv(DUST_PROXY_PORT, '4310', () => {
      const env = buildUnattendedEnv()
      expect(env[DUST_PROXY_PORT]).toBe('4310')
    })
  })
})

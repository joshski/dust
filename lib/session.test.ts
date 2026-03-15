import { describe, expect, test } from 'vitest'
import type { SessionConfig } from './env-config'
import {
  buildUnattendedEnv,
  DUST_PROXY_PORT,
  DUST_REPOSITORY_ID,
  DUST_SKIP_AGENT,
  DUST_UNATTENDED,
  isUnattended,
} from './session'

function createSessionConfig(
  overrides: Partial<SessionConfig> = {}
): SessionConfig {
  return {
    proxyPort: undefined,
    unattended: undefined,
    skipAgent: undefined,
    repositoryId: undefined,
    reposDir: undefined,
    ...overrides,
  }
}

describe('isUnattended', () => {
  test('returns false when unattended is not set', () => {
    expect(isUnattended(createSessionConfig())).toBe(false)
  })

  test('returns true when unattended is set', () => {
    expect(isUnattended(createSessionConfig({ unattended: '1' }))).toBe(true)
  })

  test('returns false when unattended is undefined', () => {
    expect(isUnattended(createSessionConfig({ unattended: undefined }))).toBe(
      false
    )
  })
})

describe('buildUnattendedEnv', () => {
  test('returns DUST_UNATTENDED and DUST_SKIP_AGENT', () => {
    const env = buildUnattendedEnv({ session: createSessionConfig() })
    expect(env).toEqual({
      [DUST_UNATTENDED]: '1',
      [DUST_SKIP_AGENT]: '1',
    })
  })

  test('includes DUST_REPOSITORY_ID when provided', () => {
    const env = buildUnattendedEnv({
      repositoryId: 'repo-123',
      session: createSessionConfig(),
    })
    expect(env).toEqual({
      [DUST_UNATTENDED]: '1',
      [DUST_SKIP_AGENT]: '1',
      [DUST_REPOSITORY_ID]: 'repo-123',
    })
  })

  test('omits DUST_REPOSITORY_ID when not provided', () => {
    const env = buildUnattendedEnv({ session: createSessionConfig() })
    expect(env[DUST_REPOSITORY_ID]).toBeUndefined()
  })

  test('includes DUST_PROXY_PORT when present in session config', () => {
    const env = buildUnattendedEnv({
      session: createSessionConfig({ proxyPort: '4310' }),
    })
    expect(env[DUST_PROXY_PORT]).toBe('4310')
  })

  test('uses explicit proxyPort over session config', () => {
    const env = buildUnattendedEnv({
      proxyPort: 5000,
      session: createSessionConfig({ proxyPort: '4310' }),
    })
    expect(env[DUST_PROXY_PORT]).toBe('5000')
  })
})

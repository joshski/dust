import { describe, expect, test } from 'vitest'
import type { SessionConfig } from '../env-config'
import { getReposDir } from './paths'

function createSessionConfig(reposDir?: string): SessionConfig {
  return {
    proxyPort: undefined,
    unattended: undefined,
    skipAgent: undefined,
    repositoryId: undefined,
    reposDir,
  }
}

describe('getReposDir', () => {
  test('returns session.reposDir when set', () => {
    const session = createSessionConfig('/custom/repos/path')
    const homeDir = '/home/user'

    const result = getReposDir(session, homeDir)

    expect(result).toBe('/custom/repos/path')
  })

  test('returns default path when reposDir is not set', () => {
    const session = createSessionConfig()
    const homeDir = '/home/user'

    const result = getReposDir(session, homeDir)

    expect(result).toBe('/home/user/.dust/repos')
  })

  test('returns default path when reposDir is undefined', () => {
    const session = createSessionConfig(undefined)
    const homeDir = '/Users/testuser'

    const result = getReposDir(session, homeDir)

    expect(result).toBe('/Users/testuser/.dust/repos')
  })

  test('returns default path when reposDir is empty string', () => {
    const session = createSessionConfig('')
    const homeDir = '/home/user'

    const result = getReposDir(session, homeDir)

    expect(result).toBe('/home/user/.dust/repos')
  })
})

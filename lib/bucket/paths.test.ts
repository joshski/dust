import { describe, expect, test } from 'vitest'
import { getReposDir } from './paths'

describe('getReposDir', () => {
  test('returns environment variable when DUST_REPOS_DIR is set', () => {
    const env = { DUST_REPOS_DIR: '/custom/repos/path' }
    const homeDir = '/home/user'

    const result = getReposDir(env, homeDir)

    expect(result).toBe('/custom/repos/path')
  })

  test('returns default path when DUST_REPOS_DIR is not set', () => {
    const env = {}
    const homeDir = '/home/user'

    const result = getReposDir(env, homeDir)

    expect(result).toBe('/home/user/.dust/repos')
  })

  test('returns default path when DUST_REPOS_DIR is undefined', () => {
    const env = { DUST_REPOS_DIR: undefined }
    const homeDir = '/Users/testuser'

    const result = getReposDir(env, homeDir)

    expect(result).toBe('/Users/testuser/.dust/repos')
  })

  test('returns default path when DUST_REPOS_DIR is empty string', () => {
    const env = { DUST_REPOS_DIR: '' }
    const homeDir = '/home/user'

    const result = getReposDir(env, homeDir)

    expect(result).toBe('/home/user/.dust/repos')
  })
})

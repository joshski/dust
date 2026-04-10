import { describe, expect, test } from 'vitest'
import type { GitRunner } from '../cli/process-runner'
import { createGitDirectoryFileSorter } from './file-sorter'

function createMockGitRunner(timestamps: Record<string, number>): GitRunner {
  return {
    run: async (gitArguments, _cwd) => {
      const file = gitArguments[gitArguments.length - 1]
      const ts = timestamps[file]
      if (ts !== undefined) {
        return { exitCode: 0, output: `${ts}\n` }
      }
      return { exitCode: 0, output: '\n' }
    },
  }
}

describe('createGitDirectoryFileSorter', () => {
  test('sorts files by git commit timestamp oldest first', async () => {
    const sorter = createGitDirectoryFileSorter(
      createMockGitRunner({
        'c.md': 100,
        'a.md': 300,
        'b.md': 200,
      })
    )

    const result = await sorter('/dir', ['a.md', 'b.md', 'c.md'])
    expect(result.map(r => r.file)).toEqual(['c.md', 'b.md', 'a.md'])
  })

  test('returns lastCommittedAt as ISO strings', async () => {
    const sorter = createGitDirectoryFileSorter(
      createMockGitRunner({
        'a.md': 1000,
      })
    )

    const result = await sorter('/dir', ['a.md'])
    expect(result[0]?.lastCommittedAt).toBe('1970-01-01T00:16:40.000Z')
  })

  test('files with no git history sort last with null lastCommittedAt', async () => {
    const sorter = createGitDirectoryFileSorter(
      createMockGitRunner({
        'tracked.md': 100,
      })
    )

    const result = await sorter('/dir', ['untracked.md', 'tracked.md'])
    expect(result.map(r => r.file)).toEqual(['tracked.md', 'untracked.md'])
    expect(result[0]?.lastCommittedAt).toBe('1970-01-01T00:01:40.000Z')
    expect(result[1]?.lastCommittedAt).toBeNull()
  })

  test('handles git runner failure gracefully', async () => {
    const sorter = createGitDirectoryFileSorter({
      run: async () => ({ exitCode: 128, output: 'fatal: not a git repo' }),
    })

    const result = await sorter('/dir', ['a.md', 'b.md'])
    expect(result.map(r => r.file)).toEqual(['a.md', 'b.md'])
    expect(result[0]?.lastCommittedAt).toBeNull()
    expect(result[1]?.lastCommittedAt).toBeNull()
  })
})

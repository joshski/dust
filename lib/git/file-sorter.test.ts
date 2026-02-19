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
    expect(result).toEqual(['c.md', 'b.md', 'a.md'])
  })

  test('files with no git history sort last', async () => {
    const sorter = createGitDirectoryFileSorter(
      createMockGitRunner({
        'tracked.md': 100,
      })
    )

    const result = await sorter('/dir', ['untracked.md', 'tracked.md'])
    expect(result).toEqual(['tracked.md', 'untracked.md'])
  })

  test('handles git runner failure gracefully', async () => {
    const sorter = createGitDirectoryFileSorter({
      run: async () => ({ exitCode: 128, output: 'fatal: not a git repo' }),
    })

    const result = await sorter('/dir', ['a.md', 'b.md'])
    expect(result).toEqual(['a.md', 'b.md'])
  })
})

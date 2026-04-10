import type { GitRunner } from '../cli/process-runner'
import type { DirectoryFileSorter } from '../cli/types'

export function createGitDirectoryFileSorter(
  gitRunner: GitRunner
): DirectoryFileSorter {
  return async (dir, files) => {
    const results = await Promise.all(
      files.map(async file => {
        const result = await gitRunner.run(
          ['log', '-1', '--format=%ct', '--', file],
          dir
        )
        const epochSeconds =
          result.exitCode === 0
            ? Number.parseInt(result.output.trim(), 10)
            : Number.NaN

        const lastCommittedAt = Number.isNaN(epochSeconds)
          ? null
          : new Date(epochSeconds * 1000).toISOString()

        return { file, lastCommittedAt }
      })
    )
    results.sort((a, b) => {
      if (a.lastCommittedAt === null && b.lastCommittedAt === null) return 0
      /* istanbul ignore next @preserve -- sort comparator direction depends on engine */
      if (a.lastCommittedAt === null) return 1
      if (b.lastCommittedAt === null) return -1
      return (
        new Date(a.lastCommittedAt).getTime() -
        new Date(b.lastCommittedAt).getTime()
      )
    })
    return results
  }
}

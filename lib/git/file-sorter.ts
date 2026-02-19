import type { GitRunner } from '../cli/process-runner'
import type { DirectoryFileSorter } from '../cli/types'

export function createGitDirectoryFileSorter(
  gitRunner: GitRunner
): DirectoryFileSorter {
  return async (dir, files) => {
    const timestamps = await Promise.all(
      files.map(async file => {
        const result = await gitRunner.run(
          ['log', '-1', '--format=%ct', '--', file],
          dir
        )
        const ts =
          result.exitCode === 0
            ? Number.parseInt(result.output.trim(), 10)
            : Number.NaN
        return {
          file,
          timestamp: Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts,
        }
      })
    )
    timestamps.sort((a, b) => a.timestamp - b.timestamp)
    return timestamps.map(t => t.file)
  }
}

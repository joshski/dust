const DEFAULT_MAX_ITERATIONS = 10 // Safety cap to prevent runaway loops in unattended mode

export function parseMaxIterations(commandArguments: string[]): number {
  if (commandArguments.length === 0) {
    return DEFAULT_MAX_ITERATIONS
  }
  const parsed = Number.parseInt(commandArguments[0], 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_MAX_ITERATIONS
  }
  return parsed
}

interface LoopArgs {
  maxIterations: number
  docker: boolean
}

export function parseLoopArgs(commandArguments: string[]): LoopArgs {
  const docker = commandArguments.includes('--docker')
  // Filter out the --docker flag before parsing max iterations
  const remainingArguments = commandArguments.filter(
    argument => argument !== '--docker'
  )
  const maxIterations = parseMaxIterations(remainingArguments)
  return { maxIterations, docker }
}

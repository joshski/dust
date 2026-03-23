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
  appleContainer: boolean
}

type LoopArgsResult =
  | { success: true; args: LoopArgs }
  | { success: false; error: string }

export function parseLoopArgs(commandArguments: string[]): LoopArgsResult {
  const docker = commandArguments.includes('--docker')
  const appleContainer = commandArguments.includes('--apple-container')

  if (docker && appleContainer) {
    return {
      success: false,
      error:
        'Cannot use both --docker and --apple-container. Choose one container runtime.',
    }
  }

  // Filter out the container flags before parsing max iterations
  const remainingArguments = commandArguments.filter(
    argument => argument !== '--docker' && argument !== '--apple-container'
  )
  const maxIterations = parseMaxIterations(remainingArguments)

  return {
    success: true,
    args: { maxIterations, docker, appleContainer },
  }
}

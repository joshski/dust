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

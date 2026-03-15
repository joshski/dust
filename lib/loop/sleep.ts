export const SLEEP_INTERVAL_MS = 30000 // 30s poll interval balances responsiveness with avoiding excessive git pulls
export const SLEEP_STEP_MS = 1000

export async function sleepWithProgress(
  sleep: (ms: number) => Promise<void>,
  totalMs: number,
  writeInline: (message: string) => void,
  writeLine: (message: string) => void
): Promise<void> {
  let remainingMs = totalMs
  while (remainingMs > 0) {
    const stepMs = Math.min(SLEEP_STEP_MS, remainingMs)
    await sleep(stepMs)
    writeInline('.')
    remainingMs -= stepMs
  }
  writeLine('')
}

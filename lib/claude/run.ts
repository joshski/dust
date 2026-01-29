import { spawnClaudeCode as defaultSpawnClaudeCode } from './spawn-claude-code'
import {
  createStdoutSink as defaultCreateStdoutSink,
  streamEvents as defaultStreamEvents,
} from './streamer'
import type { SpawnOptions } from './types'

export interface RunnerDependencies {
  spawnClaudeCode: typeof defaultSpawnClaudeCode
  createStdoutSink: typeof defaultCreateStdoutSink
  streamEvents: typeof defaultStreamEvents
}

export const defaultRunnerDependencies: RunnerDependencies = {
  spawnClaudeCode: defaultSpawnClaudeCode,
  createStdoutSink: defaultCreateStdoutSink,
  streamEvents: defaultStreamEvents,
}

export async function run(
  prompt: string,
  options: SpawnOptions = {},
  dependencies: RunnerDependencies = defaultRunnerDependencies
): Promise<void> {
  const events = dependencies.spawnClaudeCode(prompt, options)
  const sink = dependencies.createStdoutSink()
  await dependencies.streamEvents(events, sink)
}

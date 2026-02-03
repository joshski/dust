import { spawnClaudeCode as defaultSpawnClaudeCode } from './spawn-claude-code'
import {
  createStdoutSink as defaultCreateStdoutSink,
  streamEvents as defaultStreamEvents,
} from './streamer'
import type { RawEventCallback, SpawnOptions } from './types'

export interface RunOptions {
  spawnOptions?: SpawnOptions
  onRawEvent?: RawEventCallback
}

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
  options: SpawnOptions | RunOptions = {},
  dependencies: RunnerDependencies = defaultRunnerDependencies
): Promise<void> {
  // Support both legacy SpawnOptions and new RunOptions
  const isRunOptions = (opt: SpawnOptions | RunOptions): opt is RunOptions =>
    'spawnOptions' in opt || 'onRawEvent' in opt

  const spawnOptions = isRunOptions(options)
    ? (options.spawnOptions ?? {})
    : options
  const onRawEvent = isRunOptions(options) ? options.onRawEvent : undefined

  const events = dependencies.spawnClaudeCode(prompt, spawnOptions)
  const sink = dependencies.createStdoutSink()
  await dependencies.streamEvents(events, sink, onRawEvent)
}

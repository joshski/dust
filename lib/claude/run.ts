import {
  defaultDependencies as defaultSpawnDeps,
  spawnClaudeCode as defaultSpawnClaudeCode,
} from './spawn-claude-code'
import {
  createStdoutSink as defaultCreateStdoutSink,
  streamEvents as defaultStreamEvents,
} from './streamer'
import type { RawEvent, RunOptions, SpawnOptions } from './types'

const isRunOptions = (opt: SpawnOptions | RunOptions): opt is RunOptions =>
  'spawnOptions' in opt || 'onRawEvent' in opt

export interface RunnerDependencies {
  spawnClaudeCode: (
    prompt: string,
    options: SpawnOptions
  ) => AsyncGenerator<RawEvent>
  createStdoutSink: typeof defaultCreateStdoutSink
  streamEvents: typeof defaultStreamEvents
}

/* istanbul ignore next @preserve -- runtime binding wrappers, delegates to tested functions */
export const defaultRunnerDependencies: RunnerDependencies = {
  spawnClaudeCode: (prompt, options) =>
    defaultSpawnClaudeCode(prompt, options, defaultSpawnDeps),
  createStdoutSink: defaultCreateStdoutSink,
  streamEvents: defaultStreamEvents,
}

export async function run(
  prompt: string,
  options: SpawnOptions | RunOptions,
  dependencies: RunnerDependencies
): Promise<void> {
  const spawnOptions = isRunOptions(options)
    ? (options.spawnOptions ?? {})
    : options
  const onRawEvent = isRunOptions(options) ? options.onRawEvent : undefined

  const events = dependencies.spawnClaudeCode(prompt, spawnOptions)
  const sink = dependencies.createStdoutSink()
  await dependencies.streamEvents(events, sink, onRawEvent)
}

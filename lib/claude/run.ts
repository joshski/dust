import { spawnClaudeCode as defaultSpawnClaudeCode } from './spawn-claude-code'
import {
  createStdoutSink as defaultCreateStdoutSink,
  streamEvents as defaultStreamEvents,
} from './streamer'
import type { RawEventCallback, SpawnOptions } from './types'

interface RunOptions {
  spawnOptions?: SpawnOptions
  onRawEvent?: RawEventCallback
}

const isRunOptions = (opt: SpawnOptions | RunOptions): opt is RunOptions =>
  'spawnOptions' in opt || 'onRawEvent' in opt

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
  const spawnOptions = isRunOptions(options)
    ? (options.spawnOptions ?? {})
    : options
  const onRawEvent = isRunOptions(options) ? options.onRawEvent : undefined

  const events = dependencies.spawnClaudeCode(prompt, spawnOptions)
  const sink = dependencies.createStdoutSink()
  await dependencies.streamEvents(events, sink, onRawEvent)
}

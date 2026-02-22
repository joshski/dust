import { createStdoutSink as defaultCreateStdoutSink } from '../claude/streamer'
import type { RawEventCallback, SpawnOptions } from '../claude/types'
import { spawnCodex as defaultSpawnCodex } from './spawn-codex'
import { streamCodexEvents as defaultStreamCodexEvents } from './streamer'

interface RunOptions {
  spawnOptions?: SpawnOptions
  onRawEvent?: RawEventCallback
}

export interface RunnerDependencies {
  spawnCodex: typeof defaultSpawnCodex
  createStdoutSink: typeof defaultCreateStdoutSink
  streamCodexEvents: typeof defaultStreamCodexEvents
}

export const defaultRunnerDependencies: RunnerDependencies = {
  spawnCodex: defaultSpawnCodex,
  createStdoutSink: defaultCreateStdoutSink,
  streamCodexEvents: defaultStreamCodexEvents,
}

export async function run(
  prompt: string,
  options: SpawnOptions | RunOptions = {},
  dependencies: RunnerDependencies = defaultRunnerDependencies
): Promise<void> {
  const isRunOptions = (opt: SpawnOptions | RunOptions): opt is RunOptions =>
    'spawnOptions' in opt || 'onRawEvent' in opt

  const spawnOptions = isRunOptions(options)
    ? (options.spawnOptions ?? {})
    : options
  const onRawEvent = isRunOptions(options) ? options.onRawEvent : undefined

  const events = dependencies.spawnCodex(prompt, spawnOptions)
  const sink = dependencies.createStdoutSink()
  await dependencies.streamCodexEvents(events, sink, onRawEvent)
}

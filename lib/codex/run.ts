import { createStdoutSink as defaultCreateStdoutSink } from '../claude/streamer'
import type { RawEvent, RunOptions, SpawnOptions } from '../claude/types'
import {
  defaultDependencies as defaultSpawnDeps,
  spawnCodex as defaultSpawnCodex,
} from './spawn-codex'
import { streamCodexEvents as defaultStreamCodexEvents } from './streamer'

const isRunOptions = (opt: SpawnOptions | RunOptions): opt is RunOptions =>
  'spawnOptions' in opt || 'onRawEvent' in opt

export interface RunnerDependencies {
  spawnCodex: (
    prompt: string,
    options: SpawnOptions
  ) => AsyncGenerator<RawEvent>
  createStdoutSink: typeof defaultCreateStdoutSink
  streamCodexEvents: typeof defaultStreamCodexEvents
}

/* istanbul ignore next @preserve -- runtime binding wrappers, delegates to tested functions */
export const defaultRunnerDependencies: RunnerDependencies = {
  spawnCodex: (prompt, options) =>
    defaultSpawnCodex(prompt, options, defaultSpawnDeps),
  createStdoutSink: defaultCreateStdoutSink,
  streamCodexEvents: defaultStreamCodexEvents,
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

  const events = dependencies.spawnCodex(prompt, spawnOptions)
  const sink = dependencies.createStdoutSink()
  await dependencies.streamCodexEvents(events, sink, onRawEvent)
}

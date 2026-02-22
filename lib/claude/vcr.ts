/**
 * VCR-style record/replay for Claude Code runner tests.
 *
 * Cassettes capture:
 * - Raw events from Claude Code (input)
 * - Output operations produced by the streamer (output)
 *
 * Usage:
 *   CLAUDE_CODE_VCR_MODE=record bun test  # Record new cassettes
 *   bun test                               # Replay from saved cassettes
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnClaudeCode as defaultSpawnClaudeCode } from './spawn-claude-code'
import { streamEvents as defaultStreamEvents } from './streamer'
import type { OutputOp, OutputSink, RawEvent, SpawnOptions } from './types'

export interface Cassette {
  name: string
  description?: string
  rawEvents: RawEvent[]
  expectedOutput: OutputOp[]
}

export function createRecordingSink(): OutputSink & { operations: OutputOp[] } {
  const operations: OutputOp[] = []
  return {
    operations,
    write: (text: string) => operations.push({ op: 'write', text }),
    line: (text: string) => operations.push({ op: 'line', text }),
  }
}

export async function* replayEvents(
  cassette: Cassette
): AsyncGenerator<RawEvent> {
  for (const event of cassette.rawEvents) {
    yield event
  }
}

export function getCassettePath(name: string): string {
  return join(import.meta.dirname, 'fixtures', `${name}.json`)
}

export function loadCassette(name: string): Cassette {
  const path = getCassettePath(name)
  const content = readFileSync(path, 'utf-8')
  return JSON.parse(content) as Cassette
}

export function saveCassette(cassette: Cassette): void {
  const path = getCassettePath(cassette.name)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(cassette, null, 2))
}

export function cassetteExists(name: string): boolean {
  return existsSync(getCassettePath(name))
}

type VcrMode = 'record' | 'replay'

export function getVcrMode(): VcrMode {
  return process.env.CLAUDE_CODE_VCR_MODE === 'record' ? 'record' : 'replay'
}

export interface RecorderDependencies {
  spawnClaudeCode: typeof defaultSpawnClaudeCode
  streamEvents: typeof defaultStreamEvents
}

export const defaultRecorderDependencies: RecorderDependencies = {
  spawnClaudeCode: defaultSpawnClaudeCode,
  streamEvents: defaultStreamEvents,
}

/**
 * Run Claude Code and record a VCR cassette.
 * Useful for generating test fixtures from real runs.
 */
export async function recordCassette(
  name: string,
  prompt: string,
  options: SpawnOptions = {},
  description?: string,
  dependencies: RecorderDependencies = defaultRecorderDependencies
): Promise<Cassette> {
  const rawEvents: RawEvent[] = []
  const sink = createRecordingSink()

  const events = dependencies.spawnClaudeCode(prompt, options)

  async function* collectAndYield(): AsyncGenerator<RawEvent> {
    for await (const event of events) {
      rawEvents.push(event)
      yield event
    }
  }

  await dependencies.streamEvents(collectAndYield(), sink)

  const cassette: Cassette = {
    name,
    description,
    rawEvents,
    expectedOutput: sink.operations,
  }

  saveCassette(cassette)
  return cassette
}

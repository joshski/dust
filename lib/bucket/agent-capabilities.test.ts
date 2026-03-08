import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import { asChildProcessStub } from '../test/test-utilities'
import {
  CLAUDE_MODEL_ALIASES,
  discoverAgentCapabilities,
  parseCodexModelsOutput,
  selectAgentCapabilities,
  type AgentCapabilitiesDependencies,
} from './agent-capabilities'

type SpawnOutcome = {
  code?: number
  stdout?: string
  error?: Error
}

function createSpawnByCommand(
  outcomes: Record<string, SpawnOutcome>
): AgentCapabilitiesDependencies['spawn'] {
  return ((command: string, spawnArguments: string[]) => {
    const key = [command, ...spawnArguments].join(' ')
    const outcome = outcomes[key] ?? { code: 1 }

    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter | null
      stderr: EventEmitter | null
    }
    proc.stdout = new EventEmitter()
    proc.stderr = new EventEmitter()

    setTimeout(() => {
      if (outcome.stdout) {
        proc.stdout?.emit('data', Buffer.from(outcome.stdout))
      }
      if (outcome.error) {
        proc.emit('error', outcome.error)
        return
      }
      proc.emit('close', outcome.code ?? 1)
    }, 0)

    return asChildProcessStub(proc)
  }) as AgentCapabilitiesDependencies['spawn']
}

describe('parseCodexModelsOutput', () => {
  test('parses array of strings', () => {
    expect(parseCodexModelsOutput('["o3", "o4-mini"]')).toEqual([
      'o3',
      'o4-mini',
    ])
  })

  test('parses models property with object entries', () => {
    expect(
      parseCodexModelsOutput(
        JSON.stringify({
          models: [{ id: 'o3' }, { name: 'o4-mini' }, { model: 'o4' }],
        })
      )
    ).toEqual(['o3', 'o4-mini', 'o4'])
  })

  test('returns empty array for invalid JSON', () => {
    expect(parseCodexModelsOutput('not-json')).toEqual([])
  })

  test('returns empty array when parsed JSON object has no models array', () => {
    expect(parseCodexModelsOutput(JSON.stringify({ status: 'ok' }))).toEqual([])
  })

  test('filters invalid model entries and blank names', () => {
    expect(
      parseCodexModelsOutput(
        JSON.stringify({
          models: [42, '', { name: '   ' }, { alias: 'o4' }, {}],
        })
      )
    ).toEqual(['o4'])
  })
})

describe('selectAgentCapabilities', () => {
  test('returns empty list when no probes succeed', () => {
    expect(
      selectAgentCapabilities({
        claudeVersionProbe: { success: false, stdout: '' },
        codexVersionProbe: { success: false, stdout: '' },
        codexModelsProbe: null,
      })
    ).toEqual([])
  })

  test('returns claude with hardcoded model aliases when available', () => {
    expect(
      selectAgentCapabilities({
        claudeVersionProbe: { success: true, stdout: '1.2.3' },
        codexVersionProbe: { success: false, stdout: '' },
        codexModelsProbe: null,
      })
    ).toEqual([
      {
        agentType: 'claude',
        models: [...CLAUDE_MODEL_ALIASES],
      },
    ])
  })

  test('returns codex with empty models on model-probe failure (partial capability)', () => {
    expect(
      selectAgentCapabilities({
        claudeVersionProbe: { success: false, stdout: '' },
        codexVersionProbe: { success: true, stdout: '0.10.0' },
        codexModelsProbe: { success: false, stdout: '' },
      })
    ).toEqual([
      {
        agentType: 'codex',
        models: [],
      },
    ])
  })
})

describe('discoverAgentCapabilities', () => {
  test('discovers both agents and codex models via command probes', async () => {
    const spawn = createSpawnByCommand({
      'claude --version': { code: 0, stdout: 'claude 1.0.0' },
      'codex --version': { code: 0, stdout: 'codex 0.10.0' },
      'codex models --json': {
        code: 0,
        stdout: JSON.stringify({ models: [{ id: 'o3' }, { id: 'o4-mini' }] }),
      },
    })

    await expect(discoverAgentCapabilities({ spawn })).resolves.toEqual({
      type: 'agent-capabilities',
      agents: [
        { agentType: 'claude', models: [...CLAUDE_MODEL_ALIASES] },
        { agentType: 'codex', models: ['o3', 'o4-mini'] },
      ],
    })
  })

  test('returns no-capability payload when probes fail', async () => {
    const spawn = createSpawnByCommand({
      'claude --version': { error: new Error('spawn ENOENT') },
      'codex --version': { error: new Error('spawn ENOENT') },
    })

    await expect(discoverAgentCapabilities({ spawn })).resolves.toEqual({
      type: 'agent-capabilities',
      agents: [],
    })
  })

  test('returns no-capability payload when probing throws synchronously', async () => {
    const spawn = (() => {
      throw new Error('spawn failed immediately')
    }) as AgentCapabilitiesDependencies['spawn']

    await expect(discoverAgentCapabilities({ spawn })).resolves.toEqual({
      type: 'agent-capabilities',
      agents: [],
    })
  })

  test('handles non-Error synchronous throw from spawn', async () => {
    const spawn = (() => {
      throw 'bad spawn'
    }) as AgentCapabilitiesDependencies['spawn']

    await expect(discoverAgentCapabilities({ spawn })).resolves.toEqual({
      type: 'agent-capabilities',
      agents: [],
    })
  })
})

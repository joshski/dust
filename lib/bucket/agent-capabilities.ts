import type { spawn as nodeSpawn } from 'node:child_process'
import { createLogger } from '../logging'

const log = createLogger('dust:bucket:agent-capabilities')

export const CLAUDE_MODEL_ALIASES = ['opus', 'sonnet', 'haiku'] as const

type AgentCapabilityType = 'claude' | 'codex'

export interface AgentCapability {
  agentType: AgentCapabilityType
  models: string[]
}

export interface AgentCapabilitiesMessage {
  type: 'agent-capabilities'
  agents: AgentCapability[]
}

interface CommandProbeResult {
  success: boolean
  stdout: string
}

interface AgentCapabilityDecisionInput {
  claudeVersionProbe: CommandProbeResult
  codexVersionProbe: CommandProbeResult
  codexModelsProbe: CommandProbeResult | null
}

export interface AgentCapabilitiesDependencies {
  spawn: typeof nodeSpawn
  fetchCodexModelsFromApi?: (apiKey: string) => Promise<string[]>
  getEnv?: (name: string) => string | undefined
}

export function parseCodexModelsOutput(stdout: string): string[] {
  const parsed = tryParseJson(stdout)
  if (!parsed) {
    return []
  }

  if (Array.isArray(parsed)) {
    return normalizeModelList(parsed)
  }

  if (isRecord(parsed) && Array.isArray(parsed.models)) {
    return normalizeModelList(parsed.models)
  }

  return []
}

export function selectAgentCapabilities(
  input: AgentCapabilityDecisionInput
): AgentCapability[] {
  const agents: AgentCapability[] = []

  if (input.claudeVersionProbe.success) {
    agents.push({
      agentType: 'claude',
      models: [...CLAUDE_MODEL_ALIASES],
    })
  }

  if (input.codexVersionProbe.success) {
    const codexModels =
      input.codexModelsProbe && input.codexModelsProbe.success
        ? parseCodexModelsOutput(input.codexModelsProbe.stdout)
        : []

    agents.push({
      agentType: 'codex',
      models: codexModels,
    })
  }

  return agents
}

export async function fetchCodexModelsFromApi(
  apiKey: string
): Promise<string[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!response.ok) {
      log(`OpenAI models API returned ${response.status}`)
      return []
    }
    const body = (await response.json()) as {
      data?: { id: string }[]
    }
    if (!body.data || !Array.isArray(body.data)) {
      return []
    }
    return body.data
      .map(m => m.id)
      .filter(id => id.includes('codex'))
      .toSorted()
  } catch (error) {
    log(
      `OpenAI models API fetch failed: ${error instanceof Error ? error.message : String(error)}`
    )
    return []
  }
}

export async function discoverAgentCapabilities(
  dependencies: AgentCapabilitiesDependencies
): Promise<AgentCapabilitiesMessage> {
  const [claudeVersionProbe, codexVersionProbe] = await Promise.all([
    probeCommand(dependencies.spawn, 'claude', ['--version']),
    probeCommand(dependencies.spawn, 'codex', ['--version']),
  ])

  let codexModelsProbe: CommandProbeResult | null = null
  if (codexVersionProbe.success) {
    const getEnv = dependencies.getEnv ?? (name => process.env[name])
    const apiKey = getEnv('OPENAI_API_KEY')
    if (apiKey) {
      const fetcher =
        dependencies.fetchCodexModelsFromApi ?? fetchCodexModelsFromApi
      const models = await fetcher(apiKey)
      if (models.length > 0) {
        codexModelsProbe = {
          success: true,
          stdout: JSON.stringify(models),
        }
      }
    }
  }

  return {
    type: 'agent-capabilities',
    agents: selectAgentCapabilities({
      claudeVersionProbe,
      codexVersionProbe,
      codexModelsProbe,
    }),
  }
}

async function probeCommand(
  spawn: typeof nodeSpawn,
  command: string,
  arguments_: string[]
): Promise<CommandProbeResult> {
  return new Promise(resolve => {
    let stdout = ''

    try {
      const proc = spawn(command, arguments_, {
        stdio: ['ignore', 'pipe', 'ignore'],
      })

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      proc.on('close', code => {
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
        })
      })

      proc.on('error', error => {
        log(`probe failed for ${command}: ${error.message}`)
        resolve({ success: false, stdout: '' })
      })
    } catch (error) {
      log(
        `probe threw for ${command}: ${error instanceof Error ? error.message : String(error)}`
      )
      resolve({ success: false, stdout: '' })
    }
  })
}

function normalizeModelList(values: unknown[]): string[] {
  const models = new Set<string>()

  for (const value of values) {
    const model = toModelName(value)
    if (model) {
      models.add(model)
    }
  }

  return [...models]
}

function toModelName(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (!isRecord(value)) {
    return null
  }

  for (const key of ['id', 'name', 'model', 'alias']) {
    const maybeName = value[key]
    if (typeof maybeName === 'string') {
      const trimmed = maybeName.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
  }

  return null
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

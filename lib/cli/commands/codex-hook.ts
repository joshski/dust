/**
 * dust codex hook - Codex hook event dispatcher
 *
 * Reads a Codex hook event JSON payload from stdin and emits a Codex hook
 * response JSON payload on stdout. Configured in `.codex/config.toml` as:
 *
 *   [[hooks.SessionStart]]
 *   matcher = "^startup$"
 *
 *   [[hooks.SessionStart.hooks]]
 *   type = "command"
 *   command = "bunx dust codex hook"
 *
 * On `SessionStart`, emits the dust agent instructions as `additionalContext`,
 * which Codex injects directly into the model's session context. Other known
 * hook events return a no-op success payload.
 */

import { loadAgentInstructions } from '../shared/agent-shared'
import { agentGreeting } from '../shared/agent-shared'
import type { CommandDependencies, CommandResult } from '../types'

export const KNOWN_HOOK_EVENTS = [
  'PreToolUse',
  'PermissionRequest',
  'PostToolUse',
  'SessionStart',
  'UserPromptSubmit',
  'Stop',
] as const

type CodexHookEvent = (typeof KNOWN_HOOK_EVENTS)[number]

interface CodexHookDependencies {
  readStdin: () => Promise<string>
}

/* istanbul ignore next @preserve -- thin wrapper around process.stdin */
async function readStdinUtf8(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

export const defaultCodexHookDependencies: CodexHookDependencies = {
  readStdin: readStdinUtf8,
}

function isKnownEvent(value: unknown): value is CodexHookEvent {
  return (
    typeof value === 'string' &&
    (KNOWN_HOOK_EVENTS as readonly string[]).includes(value)
  )
}

async function handleSessionStart(
  dependencies: CommandDependencies
): Promise<string> {
  const { context, fileSystem, settings } = dependencies
  const agentInstructions = await loadAgentInstructions(
    context.cwd,
    fileSystem,
    'codex'
  )
  const additionalContext = agentGreeting({
    bin: settings.dustCommand,
    agentName: 'Codex',
    hooksInstalled: false,
    isClaudeCodeWeb: false,
    hasIdeaFile: true,
    agentInstructions,
  })
  return JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext,
    },
    systemMessage: 'dust agent loaded',
  })
}

function handleNoOp(): string {
  return JSON.stringify({ continue: true })
}

/* istanbul ignore next @preserve -- default parameter branch covered at runtime via main.ts */
export async function codexHook(
  dependencies: CommandDependencies,
  hookDependencies: CodexHookDependencies = defaultCodexHookDependencies
): Promise<CommandResult> {
  const { context } = dependencies
  const raw = await hookDependencies.readStdin()

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    context.stderr('dust codex hook: failed to parse stdin as JSON')
    return { exitCode: 1 }
  }

  if (!payload || typeof payload !== 'object') {
    context.stderr('dust codex hook: stdin payload must be a JSON object')
    return { exitCode: 1 }
  }

  const eventName = (payload as { hook_event_name?: unknown }).hook_event_name
  if (!isKnownEvent(eventName)) {
    context.stderr(
      `dust codex hook: unknown hook_event_name: ${JSON.stringify(eventName)}`
    )
    return { exitCode: 1 }
  }

  const response =
    eventName === 'SessionStart'
      ? await handleSessionStart(dependencies)
      : handleNoOp()

  context.stdout(response)
  return { exitCode: 0 }
}

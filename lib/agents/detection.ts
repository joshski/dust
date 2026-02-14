/**
 * Agent detection module
 *
 * Provides type-safe detection of which agent environment is running
 * based on environment variables.
 */

export type Agent =
  | { type: 'claude-code-web'; name: 'Claude Code Web' }
  | { type: 'claude-code'; name: 'Claude Code' }
  | { type: 'codex'; name: 'Codex' }
  | { type: 'unknown'; name: 'Agent' }

export type AgentType = Agent['type']

/**
 * Detects which agent environment is running based on environment variables.
 *
 * Detection priority:
 * 1. CLAUDECODE + CLAUDE_CODE_ENTRYPOINT starts with 'remote' → Claude Code Web
 * 2. CLAUDECODE alone → Claude Code
 * 3. CODEX_HOME → Codex
 * 4. Fallback → unknown Agent
 */
export function detectAgent(env: NodeJS.ProcessEnv = process.env): Agent {
  if (env.CLAUDECODE) {
    if (env.CLAUDE_CODE_ENTRYPOINT?.startsWith('remote')) {
      return { type: 'claude-code-web', name: 'Claude Code Web' }
    }
    return { type: 'claude-code', name: 'Claude Code' }
  }
  if (env.CODEX_HOME) {
    return { type: 'codex', name: 'Codex' }
  }
  return { type: 'unknown', name: 'Agent' }
}

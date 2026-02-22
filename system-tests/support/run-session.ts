/**
 * Helper for running multi-turn agent sessions in e2e tests
 */

import {
  type ActionHandler,
  type AgentSession,
  createAgentEmulator,
} from './agent-emulator'
import {
  createShellEmulator,
  type ShellEmulatorOptions,
} from './shell-emulator'

interface RunSessionOptions extends ShellEmulatorOptions {
  handlers: ActionHandler[]
}

export async function runSession(
  options: RunSessionOptions
): Promise<AgentSession> {
  const { handlers, ...shellOptions } = options
  const shell = await createShellEmulator(shellOptions)
  const agent = createAgentEmulator(shell, { actionHandlers: handlers })
  return agent.runSession('bin/dust agent')
}

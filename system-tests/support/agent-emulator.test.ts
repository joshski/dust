/**
 * Unit tests for agent emulator
 */

import { beforeEach, describe, expect, test } from 'vitest'
import {
  createAgentEmulator,
  createScenarioAgent,
  NoHandlerMatchError,
} from './agent-emulator'
import { createShellEmulator, type ShellEmulator } from './shell-emulator'

describe('agent emulator', () => {
  let shell: ShellEmulator

  beforeEach(async () => {
    shell = await createShellEmulator()
  })

  test('runs multi-turn session with scenario agent', async () => {
    const agent = createScenarioAgent(shell, [
      'bin/dust agent',
      'bin/dust new task',
    ])

    const session = await agent.runSession('bin/dust agent')

    expect(session.turns.length).toBeGreaterThanOrEqual(2)
    expect(session.turns[0].command).toBe('bin/dust agent')
    expect(session.turns[1].command).toBe('bin/dust new task')
  })

  test('uses pattern-based action handlers', async () => {
    const agent = createAgentEmulator(shell, {
      actionHandlers: [
        {
          pattern: /dust new task/,
          getCommand: () => 'bin/dust new task',
        },
        {
          // Stop after new task output
          pattern: /Adding a New Task/,
          getCommand: () => null,
        },
      ],
    })

    const session = await agent.runSession('bin/dust agent')

    expect(session.turns.length).toBe(2)
    expect(session.turns[1].command).toBe('bin/dust new task')
    expect(session.turns[1].result.exitCode).toBe(0)
  })

  test('throws NoHandlerMatchError when no handler matches', async () => {
    const agent = createAgentEmulator(shell, {
      actionHandlers: [],
      useDefaultHandlers: false,
    })

    await expect(agent.runSession('bin/dust agent')).rejects.toThrow(
      NoHandlerMatchError
    )
  })

  test('NoHandlerMatchError contains useful debugging information', async () => {
    const agent = createAgentEmulator(shell, {
      actionHandlers: [],
      useDefaultHandlers: false,
    })

    try {
      await agent.runSession('bin/dust agent')
    } catch (error) {
      expect(error).toBeInstanceOf(NoHandlerMatchError)
      const handlerError = error as NoHandlerMatchError
      expect(handlerError.command).toBe('bin/dust agent')
      expect(handlerError.output).toContain('welcome to dust')
      expect(handlerError.turns).toHaveLength(1)
    }
  })

  test('stops session when handler returns null', async () => {
    const agent = createAgentEmulator(shell, {
      actionHandlers: [
        {
          pattern: /welcome to dust/,
          getCommand: () => null,
        },
      ],
      useDefaultHandlers: false,
    })

    const session = await agent.runSession('bin/dust agent')

    // Should stop after first command
    expect(session.turns).toHaveLength(1)
  })

  test('respects maxTurns limit', async () => {
    const agent = createAgentEmulator(shell, {
      maxTurns: 1,
      actionHandlers: [
        {
          pattern: /.*/,
          getCommand: () => 'bin/dust help',
        },
      ],
    })

    const session = await agent.runSession('bin/dust agent')

    expect(session.turns).toHaveLength(1)
  })
})

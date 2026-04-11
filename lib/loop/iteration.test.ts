import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import type { AgentSessionEvent } from '../agent-events'
import {
  asTestType,
  createContextEmulator,
  createFileSystemEmulator,
  createSpawnEmulator,
  createTestRuntimeConfig,
  createTestSessionConfig,
} from '../test-support/test-utilities'
import type { CommandDependencies } from '../cli/types'
import type { ContainerRuntime } from '../container/runtime'
import type { LoopEmitFn } from './events'
import type { LoopEvent } from './events'
import {
  buildContainerShellRunner,
  buildTaskPrompt,
  createDefaultDependencies,
  DUST_QUICK_REFERENCE,
  findAvailableTasks,
  type LoopDependencies,
  runOneIteration,
} from './iteration'
import type { SendAgentEventFn } from './wire-events'

function createDependencies(
  tree: Parameters<typeof createFileSystemEmulator>[0] = {}
): CommandDependencies {
  const context = createContextEmulator()
  const fileSystem = createFileSystemEmulator(tree)
  return {
    arguments: [],
    context,
    fileSystem,
    globScanner: fileSystem,
    runtime: createTestRuntimeConfig(),
    settings: { dustCommand: 'dust' },
  }
}

function createPassingShellRunner(): LoopDependencies['shellRunner'] {
  return {
    run: async () => ({ exitCode: 0, output: '' }),
  }
}

function createLoopDeps(
  overrides: Partial<LoopDependencies> = {}
): LoopDependencies {
  const { spawn } = createSpawnEmulator({ autoResolve: true })
  return {
    spawn: asTestType<LoopDependencies['spawn']>(spawn),
    run: async () => {},
    sleep: async () => {},
    postEvent: async () => {},
    session: createTestSessionConfig(),
    shellRunner: createPassingShellRunner(),
    ...overrides,
  }
}

function createStubCallbacks(): {
  onLoopEvent: LoopEmitFn & { events: LoopEvent[] }
  onAgentEvent: SendAgentEventFn & { events: AgentSessionEvent[] }
} {
  const loopEvents: LoopEvent[] = []
  const agentEvents: AgentSessionEvent[] = []
  const onLoopEvent: LoopEmitFn = (event: LoopEvent) => {
    loopEvents.push(event)
  }
  const onAgentEvent: SendAgentEventFn = (event: AgentSessionEvent) => {
    agentEvents.push(event)
  }
  return {
    onLoopEvent: Object.assign(onLoopEvent, { events: loopEvents }),
    onAgentEvent: Object.assign(onAgentEvent, { events: agentEvents }),
  }
}

describe('createDefaultDependencies', () => {
  test('returns object with spawn, run, sleep, and postEvent functions', () => {
    const loopDependencies = createDefaultDependencies()
    expect(typeof loopDependencies.spawn).toBe('function')
    expect(typeof loopDependencies.run).toBe('function')
    expect(typeof loopDependencies.sleep).toBe('function')
    expect(typeof loopDependencies.postEvent).toBe('function')
  })

  test('sleep function resolves after given time', async () => {
    const loopDependencies = createDefaultDependencies()
    // Use 0ms to avoid actual delay in tests
    await expect(loopDependencies.sleep(0)).resolves.toBeUndefined()
  })
})

describe('findAvailableTasks', () => {
  test('returns empty array when no tasks exist', async () => {
    const dependencies = createDependencies()
    const result = await findAvailableTasks(dependencies)
    expect(result.tasks).toEqual([])
    expect(result.invalidTasks).toEqual([])
  })

  test('returns tasks when they exist', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const result = await findAvailableTasks(dependencies)
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].title).toBe('Task')
  })
})

describe('runOneIteration', () => {
  test('syncs with git pull', async () => {
    const dependencies = createDependencies()
    const { spawn, getSpawnedProcesses } = createSpawnEmulator({
      autoResolve: true,
    })
    const loopDeps = createLoopDeps({
      spawn: asTestType<LoopDependencies['spawn']>(spawn),
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent)
    expect(getSpawnedProcesses().length).toBeGreaterThan(0)
  })

  test('spawns Claude to resolve git pull failures and emits events', async () => {
    const dependencies = createDependencies()
    let claudePrompt: string | undefined
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      commands: {
        git: { exitCode: 1, stderr: 'merge conflict' },
      },
    })
    const loopDeps = createLoopDeps({
      spawn: asTestType<LoopDependencies['spawn']>(spawn),
      run: async prompt => {
        claudePrompt = prompt
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    const result = await runOneIteration(
      dependencies,
      loopDeps,
      onLoopEvent,
      onAgentEvent
    )
    expect(result).toBe('resolved_pull_conflict')
    expect(claudePrompt).toContain('merge conflict')
    expect(claudePrompt).toContain('git pull failed')

    // Check events
    const syncSkippedEvent = onLoopEvent.events.find(
      event => event.type === 'loop.sync_skipped'
    )
    expect(syncSkippedEvent).toBeDefined()
    const agentStarted = onAgentEvent.events.find(
      event => event.type === 'agent-session-started'
    )
    const agentEnded = onAgentEvent.events.find(
      event => event.type === 'agent-session-ended'
    )
    expect(agentStarted).toBeDefined()
    expect((agentStarted as { title?: string })?.title).toBe(
      'Resolving git conflict'
    )
    expect(agentEnded).toBeDefined()
    expect((agentEnded as { success: boolean } | undefined)?.success).toBe(true)
  })

  test('handles Claude failure when resolving git pull conflict', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      commands: {
        git: { exitCode: 1, stderr: 'conflict' },
      },
    })
    const loopDeps = createLoopDeps({
      spawn: asTestType<LoopDependencies['spawn']>(spawn),
      run: async () => {
        throw new Error('Claude crashed')
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    const result = await runOneIteration(
      dependencies,
      loopDeps,
      onLoopEvent,
      onAgentEvent
    )
    // Should still return no_tasks and continue the loop
    expect(result).toBe('no_tasks')
    expect(context.stderrLines.join('\n')).toContain(
      'Claude failed to resolve git pull conflict'
    )

    // Check agent-session-ended event with error
    const agentEnded = onAgentEvent.events.find(
      event => event.type === 'agent-session-ended'
    )
    expect(agentEnded).toBeDefined()
    expect((agentEnded as { success: boolean } | undefined)?.success).toBe(
      false
    )
  })

  test('handles non-Error throws from Claude when resolving git pull conflict', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      commands: {
        git: { exitCode: 1, stderr: 'conflict' },
      },
    })
    const loopDeps = createLoopDeps({
      spawn: asTestType<LoopDependencies['spawn']>(spawn),
      run: async () => {
        throw 'string error'
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    const result = await runOneIteration(
      dependencies,
      loopDeps,
      onLoopEvent,
      onAgentEvent
    )
    expect(result).toBe('no_tasks')
    expect(context.stderrLines.join('\n')).toContain('string error')
  })

  test('returns no_tasks when no tasks available', async () => {
    const dependencies = createDependencies()
    const loopDeps = createLoopDeps()
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    const result = await runOneIteration(
      dependencies,
      loopDeps,
      onLoopEvent,
      onAgentEvent
    )
    expect(result).toBe('no_tasks')
  })

  test('logs skipped invalid tasks when no valid work is available', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'bad-task.md': '# Bad Task\n\nMissing headings.',
          },
        },
      },
    })
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }
    const loopDeps = createLoopDeps()
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    const result = await runOneIteration(
      dependencies,
      loopDeps,
      onLoopEvent,
      onAgentEvent
    )
    expect(result).toBe('no_tasks')

    const stderrOutput = context.stderrLines.join('\n')
    expect(stderrOutput).toContain('Skipped invalid tasks')
    expect(stderrOutput).toContain('.dust/tasks/bad-task.md')
    expect(stderrOutput).toContain('Missing required heading')
  })

  test('invokes Claude when tasks are available', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    let claudeCalled = false
    const loopDeps = createLoopDeps({
      run: async () => {
        claudeCalled = true
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    const result = await runOneIteration(
      dependencies,
      loopDeps,
      onLoopEvent,
      onAgentEvent
    )
    expect(claudeCalled).toBe(true)
    expect(result).toBe('ran_claude')
  })

  test('constructs prompt with task content and implementation instructions', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\nDo the thing.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    dependencies.settings = {
      dustCommand: 'bunx dust',
      installCommand: 'bun install',
    }
    let capturedPrompt: string | undefined
    const loopDeps = createLoopDeps({
      run: async prompt => {
        capturedPrompt = prompt
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent)
    expect(capturedPrompt).toContain(
      'Implement the task at `.dust/tasks/task.md`'
    )
    expect(capturedPrompt).toContain('Do the thing.')
    // Loop handles install and checks, so agent prompt should NOT contain them
    expect(capturedPrompt).not.toContain(
      '`bun install` to install dependencies'
    )
    expect(capturedPrompt).not.toContain('Run `bunx dust check` to verify')
    expect(capturedPrompt).toContain(
      'Deletion of the completed task file (`.dust/tasks/task.md`)'
    )
    // Should include skip guidance but not routing commands
    expect(capturedPrompt).toContain('Do NOT run `bunx dust agent`')
    expect(capturedPrompt).not.toContain('pick task')
    expect(capturedPrompt).not.toContain('run the matching command')
  })

  test('omits install step when installCommand is not set in settings', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    let capturedPrompt: string | undefined
    const loopDeps = createLoopDeps({
      run: async prompt => {
        capturedPrompt = prompt
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent)
    expect(capturedPrompt).not.toContain('install dependencies')
    expect(capturedPrompt).toContain('`dust check`')
  })

  test('passes correct cwd to Claude run', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    let capturedCwd: string | undefined
    const loopDeps = createLoopDeps({
      run: async (_prompt, options) => {
        const runOptions = options as { spawnOptions?: { cwd?: string } }
        capturedCwd = runOptions?.spawnOptions?.cwd
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent)
    expect(capturedCwd).toBe('/project')
  })

  test('passes DUST_UNATTENDED env var to Claude', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    let capturedEnv: Record<string, string> | undefined
    const loopDeps = createLoopDeps({
      run: async (_prompt, options) => {
        const runOptions = options as {
          spawnOptions?: { env?: Record<string, string> }
        }
        capturedEnv = runOptions?.spawnOptions?.env
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent, {})

    expect(capturedEnv).toBeDefined()
    expect(capturedEnv?.DUST_UNATTENDED).toBe('1')
  })

  test('passes DUST_REPOSITORY_ID env var when repositoryId is provided', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    let capturedEnv: Record<string, string> | undefined
    const loopDeps = createLoopDeps({
      run: async (_prompt, options) => {
        const runOptions = options as {
          spawnOptions?: { env?: Record<string, string> }
        }
        capturedEnv = runOptions?.spawnOptions?.env
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent, {
      repositoryId: 'repo-abc-123',
    })

    expect(capturedEnv).toBeDefined()
    expect(capturedEnv?.DUST_REPOSITORY_ID).toBe('repo-abc-123')
  })

  test('does not set DUST_REPOSITORY_ID when repositoryId is not provided', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    let capturedEnv: Record<string, string> | undefined
    const loopDeps = createLoopDeps({
      run: async (_prompt, options) => {
        const runOptions = options as {
          spawnOptions?: { env?: Record<string, string> }
        }
        capturedEnv = runOptions?.spawnOptions?.env
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent, {})

    expect(capturedEnv).toBeDefined()
    expect(capturedEnv?.DUST_REPOSITORY_ID).toBeUndefined()
  })

  test('passes DUST_TRACE_ID env var when traceId is provided', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    let capturedEnv: Record<string, string> | undefined
    const loopDeps = createLoopDeps({
      run: async (_prompt, options) => {
        const runOptions = options as {
          spawnOptions?: { env?: Record<string, string> }
        }
        capturedEnv = runOptions?.spawnOptions?.env
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent, {
      traceId: 'trace-abc-123',
    })

    expect(capturedEnv).toBeDefined()
    expect(capturedEnv?.DUST_TRACE_ID).toBe('trace-abc-123')
  })

  test('does not set DUST_TRACE_ID when traceId is not provided', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    let capturedEnv: Record<string, string> | undefined
    const loopDeps = createLoopDeps({
      run: async (_prompt, options) => {
        const runOptions = options as {
          spawnOptions?: { env?: Record<string, string> }
        }
        capturedEnv = runOptions?.spawnOptions?.env
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent, {})

    expect(capturedEnv).toBeDefined()
    expect(capturedEnv?.DUST_TRACE_ID).toBeUndefined()
  })

  test('handles Claude errors gracefully', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
      run: async () => {
        throw new Error('Claude crashed')
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    const result = await runOneIteration(
      dependencies,
      loopDeps,
      onLoopEvent,
      onAgentEvent
    )
    expect(result).toBe('claude_error')
    expect(context.stderrLines.join('\n')).toContain('Claude exited with error')
    expect(context.stderrLines.join('\n')).toContain('Claude crashed')
  })

  test('logs error with injected logger when Claude fails', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# My Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const loopDeps = createLoopDeps({
      run: async () => {
        throw new Error('Connection timeout')
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()
    const logMessages: string[] = []
    const mockLogger = (message: string) => {
      logMessages.push(message)
    }

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent, {
      logger: mockLogger,
    })

    expect(logMessages).toHaveLength(1)
    expect(logMessages[0]).toBe(
      'Claude error on task My Task: Connection timeout'
    )
  })

  test('logs error with task path when task has no title', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              'No heading here\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const loopDeps = createLoopDeps({
      run: async () => {
        throw new Error('API error')
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()
    const logMessages: string[] = []
    const mockLogger = (message: string) => {
      logMessages.push(message)
    }

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent, {
      logger: mockLogger,
    })

    expect(logMessages).toHaveLength(1)
    expect(logMessages[0]).toBe(
      'Claude error on task .dust/tasks/task.md: API error'
    )
  })

  test('handles non-Error throws from Claude', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
      run: async () => {
        throw 'string error'
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    const result = await runOneIteration(
      dependencies,
      loopDeps,
      onLoopEvent,
      onAgentEvent
    )
    expect(result).toBe('claude_error')
    expect(context.stderrLines.join('\n')).toContain('string error')
  })

  test('emits agent-session-started and agent-session-ended events', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const loopDeps = createLoopDeps({
      run: async () => {},
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent)

    const startedEvent = onAgentEvent.events.find(
      event => event.type === 'agent-session-started'
    )
    const endedEvent = onAgentEvent.events.find(
      event => event.type === 'agent-session-ended'
    )
    expect(startedEvent).toBeDefined()
    expect(startedEvent?.type).toBe('agent-session-started')
    expect((startedEvent as { title?: string })?.title).toBe('Task')
    expect(endedEvent).toBeDefined()
    expect(endedEvent?.type).toBe('agent-session-ended')
    expect((endedEvent as { success: boolean } | undefined)?.success).toBe(true)
  })

  test('uses task path as title fallback when task has no title', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              'No heading here\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const loopDeps = createLoopDeps({
      run: async () => {},
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent)

    const startedEvent = onAgentEvent.events.find(
      event => event.type === 'agent-session-started'
    )
    expect(startedEvent).toBeDefined()
    expect((startedEvent as { title: string }).title).toBe(
      '.dust/tasks/task.md'
    )
  })

  test('emits agent-session-ended with error message on failure', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const loopDeps = createLoopDeps({
      run: async () => {
        throw new Error('Claude crashed')
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent)

    const endedEvent = onAgentEvent.events.find(
      event => event.type === 'agent-session-ended'
    )
    expect(endedEvent).toBeDefined()
    expect((endedEvent as { success: boolean } | undefined)?.success).toBe(
      false
    )
    expect((endedEvent as { error: string } | undefined)?.error).toBe(
      'Claude crashed'
    )
  })

  test('includes prompt, agentType, and purpose in agent-session-started event for tasks', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    dependencies.settings = {
      dustCommand: 'bunx dust',
      installCommand: 'bun install',
    }
    const loopDeps = createLoopDeps({
      run: async () => {},
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent)

    const startedEvent = onAgentEvent.events.find(
      event => event.type === 'agent-session-started'
    ) as {
      prompt: string
      agentType: string
      purpose: string
    }
    expect(startedEvent).toBeDefined()
    // Loop handles install and checks, so agent prompt should NOT contain them
    expect(startedEvent.prompt).not.toContain(
      '`bun install` to install dependencies'
    )
    expect(startedEvent.prompt).not.toContain('Run `bunx dust check` to verify')
    expect(startedEvent.agentType).toBe('claude')
    expect(startedEvent.purpose).toBe('task')
  })

  test('includes prompt, agentType, and purpose in agent-session-started event for git conflicts', async () => {
    const dependencies = createDependencies()
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      commands: {
        git: { exitCode: 1, stderr: 'merge conflict' },
      },
    })
    const loopDeps = createLoopDeps({
      spawn: asTestType<LoopDependencies['spawn']>(spawn),
      run: async () => {},
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent)

    const startedEvent = onAgentEvent.events.find(
      event => event.type === 'agent-session-started'
    ) as {
      prompt: string
      agentType: string
      purpose: string
    }
    expect(startedEvent).toBeDefined()
    expect(startedEvent.prompt).toContain('git pull failed')
    expect(startedEvent.prompt).toContain('merge conflict')
    expect(startedEvent.agentType).toBe('claude')
    expect(startedEvent.purpose).toBe('git-conflict')
  })

  test('passes onRawEvent callback to Claude run when provided', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()
    const rawEvents: Record<string, unknown>[] = []

    const loopDeps = createLoopDeps({
      run: async (_prompt, options) => {
        // Check if onRawEvent is passed in RunOptions format and call it
        const onRawEvent = (
          options as { onRawEvent?: (e: Record<string, unknown>) => void }
        )?.onRawEvent
        if (onRawEvent) {
          // Invoke the callback with a test event
          onRawEvent({ type: 'text_delta', text: 'Hello' })
        }
      },
    })

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent, {
      onRawEvent: rawEvents.push.bind(rawEvents),
    })

    // Verify the raw event was received by the callback
    expect(rawEvents).toHaveLength(1)
    expect(rawEvents[0]).toEqual({
      type: 'text_delta',
      text: 'Hello',
    })
  })

  test('does not pass onRawEvent callback when not provided', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()
    let capturedOnRawEvent: unknown = 'not-set'

    const loopDeps = createLoopDeps({
      run: async (_prompt, options) => {
        capturedOnRawEvent = (options as { onRawEvent?: unknown })?.onRawEvent
      },
    })

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent)

    expect(capturedOnRawEvent).toBeUndefined()
  })

  test('includes toolsSection in prompt when provided', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    let capturedPrompt: string | undefined
    const loopDeps = createLoopDeps({
      run: async prompt => {
        capturedPrompt = prompt
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()
    const toolsSection = `## Available Tools

### asset-upload
Upload a file to dustbucket.

Usage: \`dust bucket tool asset-upload <file>\``

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent, {
      toolsSection,
    })

    expect(capturedPrompt).toContain('## Available Tools')
    expect(capturedPrompt).toContain('### asset-upload')
    expect(capturedPrompt).toContain(
      'Usage: `dust bucket tool asset-upload <file>`'
    )
  })

  test('does not add extra newlines when toolsSection is empty', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    let capturedPrompt: string | undefined
    const loopDeps = createLoopDeps({
      run: async prompt => {
        capturedPrompt = prompt
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent, {
      toolsSection: '',
    })

    // Prompt should end with the implementation instructions without trailing tools section
    expect(capturedPrompt).not.toContain('## Available Tools')
    // Should not have trailing newlines from empty toolsSection
    expect(capturedPrompt?.endsWith('\n\n')).toBe(false)
  })

  test('includes branch context in prompt when branch is specified', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    let capturedPrompt: string | undefined
    const loopDeps = createLoopDeps({
      run: async prompt => {
        capturedPrompt = prompt
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent, {
      branch: 'staging',
    })

    expect(capturedPrompt).toContain('You are working on the `staging` branch.')
    expect(
      capturedPrompt?.startsWith('You are working on the `staging` branch.')
    ).toBe(true)
  })

  test('omits branch context in prompt when branch is not specified', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    let capturedPrompt: string | undefined
    const loopDeps = createLoopDeps({
      run: async prompt => {
        capturedPrompt = prompt
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent, {})

    expect(capturedPrompt).not.toContain('You are working on')
    expect(capturedPrompt?.startsWith('Implement the task')).toBe(true)
  })

  test('spawns check-fix agent when pre-flight checks fail', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    let capturedPrompt: string | undefined
    const loopDeps = createLoopDeps({
      run: async prompt => {
        capturedPrompt = prompt
      },
      shellRunner: {
        run: async () => ({
          exitCode: 1,
          output: '✗ lint\n\nError: unused variable',
        }),
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    const result = await runOneIteration(
      dependencies,
      loopDeps,
      onLoopEvent,
      onAgentEvent
    )

    expect(result).toBe('ran_check_fix')
    expect(capturedPrompt).toContain('checks are failing')
    expect(capturedPrompt).toContain('unused variable')
    expect(capturedPrompt).not.toContain('Implement the task')
  })

  test('emits check-fix agent events when checks fail', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const loopDeps = createLoopDeps({
      run: async () => {},
      shellRunner: {
        run: async () => ({
          exitCode: 1,
          output: 'test failures',
        }),
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent)

    const startedEvent = onAgentEvent.events.find(
      event => event.type === 'agent-session-started'
    ) as { title: string; purpose: string }
    expect(startedEvent).toBeDefined()
    expect(startedEvent.title).toBe('Fixing failing checks')
    expect(startedEvent.purpose).toBe('check-fix')

    const checksFailedEvent = onLoopEvent.events.find(
      event => event.type === 'loop.checks_failed'
    )
    expect(checksFailedEvent).toBeDefined()

    // Verify wire events for preflight failure
    const preflightFailed = onAgentEvent.events.find(
      event => event.type === 'preflight-failed'
    ) as { step: string; output: string }
    expect(preflightFailed).toBeDefined()
    expect(preflightFailed.step).toBe('checks')
    expect(preflightFailed.output).toBe('test failures')
  })

  test('emits checks_passed event when pre-flight checks succeed', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const loopDeps = createLoopDeps({
      run: async () => {},
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent)

    const checksPassedEvent = onLoopEvent.events.find(
      event => event.type === 'loop.checks_passed'
    )
    expect(checksPassedEvent).toBeDefined()

    // Verify wire events were emitted
    const preflightStarted = onAgentEvent.events.find(
      event => event.type === 'preflight-started'
    )
    expect(preflightStarted).toBeDefined()
    const preflightCompleted = onAgentEvent.events.find(
      event => event.type === 'preflight-completed'
    ) as { step: string } | undefined
    expect(preflightCompleted).toBeDefined()
    expect(preflightCompleted!.step).toBe('checks')
  })

  test('runs install command before checks when installCommand is configured', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    dependencies.settings = {
      dustCommand: 'dust',
      installCommand: 'bun install',
    }
    const commandsRun: string[] = []
    const loopDeps = createLoopDeps({
      run: async () => {},
      shellRunner: {
        run: async command => {
          commandsRun.push(command)
          return { exitCode: 0, output: '' }
        },
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent)

    expect(commandsRun).toEqual(['bun install', 'dust check'])
    const installingEvent = onLoopEvent.events.find(
      event => event.type === 'loop.installing'
    )
    expect(installingEvent).toBeDefined()
  })

  test('spawns check-fix agent when install command fails', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    dependencies.settings = {
      dustCommand: 'dust',
      installCommand: 'bun install',
    }
    let capturedPrompt: string | undefined
    const loopDeps = createLoopDeps({
      run: async prompt => {
        capturedPrompt = prompt
      },
      shellRunner: {
        run: async () => ({
          exitCode: 1,
          output: 'install error: package not found',
        }),
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    const result = await runOneIteration(
      dependencies,
      loopDeps,
      onLoopEvent,
      onAgentEvent
    )

    expect(result).toBe('ran_check_fix')
    expect(capturedPrompt).toContain('package not found')
    const installFailedEvent = onLoopEvent.events.find(
      event => event.type === 'loop.install_failed'
    )
    expect(installFailedEvent).toBeDefined()

    // Verify wire events for install failure
    const preflightFailed = onAgentEvent.events.find(
      event => event.type === 'preflight-failed'
    ) as { step: string; output: string }
    expect(preflightFailed).toBeDefined()
    expect(preflightFailed.step).toBe('install')
    expect(preflightFailed.output).toContain('package not found')
  })

  test('returns ran_check_fix even when fix agent throws', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const loopDeps = createLoopDeps({
      run: async () => {
        throw new Error('agent crashed')
      },
      shellRunner: {
        run: async () => ({
          exitCode: 1,
          output: 'check failure',
        }),
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    const result = await runOneIteration(
      dependencies,
      loopDeps,
      onLoopEvent,
      onAgentEvent
    )

    expect(result).toBe('ran_check_fix')
  })

  test('handles non-Error throws from check-fix agent', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
      run: async () => {
        throw 'string error from fix agent'
      },
      shellRunner: {
        run: async () => ({
          exitCode: 1,
          output: 'check failure',
        }),
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    const result = await runOneIteration(
      dependencies,
      loopDeps,
      onLoopEvent,
      onAgentEvent
    )

    expect(result).toBe('ran_check_fix')
    expect(context.stderrLines.join('\n')).toContain(
      'string error from fix agent'
    )
  })

  test('uses Codex as agent name when agentType is codex', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
      agentType: 'codex',
      run: async () => {
        throw new Error('Codex crashed')
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    const result = await runOneIteration(
      dependencies,
      loopDeps,
      onLoopEvent,
      onAgentEvent
    )
    expect(result).toBe('claude_error')
    expect(context.stderrLines.join('\n')).toContain('Codex exited with error')
  })

  test('uses container shell runner for pre-flight when docker and containerRuntime are set', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const { spawn, getSpawnedProcesses } = createSpawnEmulator({
      autoResolve: true,
    })
    const loopDeps = createLoopDeps({
      spawn: asTestType<LoopDependencies['spawn']>(spawn),
      run: async () => {},
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    const docker = {
      imageTag: 'test-image',
      repoPath: '/project',
      homeDir: '/home/user',
      gitProxyUrl: 'http://proxy:3001',
    }
    const containerRuntime: ContainerRuntime = {
      name: 'docker',
      isAvailable: async () => true,
      buildImage: async () => ({ success: true }),
      runCommand: 'docker',
      hostAddress: 'host.docker.internal',
      buildRunArgs: config => [
        'run',
        '--rm',
        '-v',
        `${config.repoPath}:/workspace`,
        '-w',
        '/workspace',
        '-e',
        `GIT_PROXY_URL=${config.gitProxyUrl}`,
        config.imageTag,
      ],
    }

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent, {
      docker,
      containerRuntime,
    })

    const spawned = getSpawnedProcesses()
    const dockerSpawn = spawned.find(p => p.command === 'docker')
    expect(dockerSpawn).toBeDefined()
    expect(dockerSpawn?.arguments).toContain('run')
    expect(dockerSpawn?.arguments).toContain('sh')
    expect(dockerSpawn?.arguments).toContain('-c')
    expect(dockerSpawn?.arguments).toContain('dust check')
    expect(dockerSpawn?.arguments).toContain('test-image')
    expect(dockerSpawn?.arguments).toContain('GIT_PROXY_URL=http://proxy:3001')
  })

  test('falls back to host shell runner when docker is set but containerRuntime is not', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const commandsRun: string[] = []
    const loopDeps = createLoopDeps({
      run: async () => {},
      shellRunner: {
        run: async command => {
          commandsRun.push(command)
          return { exitCode: 0, output: '' }
        },
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent, {
      docker: {
        imageTag: 'test-image',
        repoPath: '/project',
        homeDir: '/home/user',
      },
      // No containerRuntime
    })

    expect(commandsRun).toContain('dust check')
  })

  test('uses host shell runner when neither docker nor containerRuntime are set', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const commandsRun: string[] = []
    const loopDeps = createLoopDeps({
      run: async () => {},
      shellRunner: {
        run: async command => {
          commandsRun.push(command)
          return { exitCode: 0, output: '' }
        },
      },
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    await runOneIteration(dependencies, loopDeps, onLoopEvent, onAgentEvent, {})

    expect(commandsRun).toContain('dust check')
  })

  test('uses defaultShellRunner when shellRunner is not provided', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    const loopDeps = createLoopDeps({
      shellRunner: undefined,
    })
    const { onLoopEvent, onAgentEvent } = createStubCallbacks()

    // This will use the real defaultShellRunner which will fail on `dust check`,
    // but that's fine — we just need to verify it doesn't crash with undefined
    const result = await runOneIteration(
      dependencies,
      loopDeps,
      onLoopEvent,
      onAgentEvent
    )
    // defaultShellRunner will run `dust check` which will likely fail,
    // so we expect ran_check_fix (check failure triggers fix agent)
    expect(['ran_check_fix', 'ran_claude']).toContain(result)
  })
})

describe('buildTaskPrompt', () => {
  test('includes DUST_QUICK_REFERENCE in the prompt', () => {
    const prompt = buildTaskPrompt(
      '.dust/tasks/task.md',
      '# Task\n\nDo something.',
      'Implementation instructions here.',
      '',
      'dust'
    )

    expect(prompt).toContain('## Dust Quick Reference')
    expect(prompt).toContain('dust ideas')
    expect(prompt).toContain('dust principles')
    expect(prompt).toContain('dust facts')
    expect(prompt).toContain('dust help')
    expect(prompt).toContain(
      'Use dust commands instead of manually searching `.dust/` directories'
    )
  })

  test('places guide between task content and implementation instructions', () => {
    const prompt = buildTaskPrompt(
      '.dust/tasks/task.md',
      '# Task\n\nDo something.',
      'Implementation instructions here.',
      '',
      'dust'
    )

    const taskContentEnd = prompt.indexOf(
      '----------\n\n## Dust Quick Reference'
    )
    const guideStart = prompt.indexOf('## Dust Quick Reference')
    const implStart = prompt.indexOf('## How to implement the task')

    expect(taskContentEnd).toBeGreaterThan(-1)
    expect(guideStart).toBeGreaterThan(-1)
    expect(implStart).toBeGreaterThan(-1)
    expect(guideStart).toBeLessThan(implStart)
  })

  test('includes tools section after implementation instructions', () => {
    const toolsSection = `## Available Tools

### asset-upload
Upload a file.`

    const prompt = buildTaskPrompt(
      '.dust/tasks/task.md',
      '# Task',
      'Instructions.',
      toolsSection,
      'dust'
    )

    const implStart = prompt.indexOf('## How to implement the task')
    const toolsStart = prompt.indexOf('## Available Tools')

    expect(toolsStart).toBeGreaterThan(implStart)
  })

  test('does not add tools section when empty', () => {
    const prompt = buildTaskPrompt(
      '.dust/tasks/task.md',
      '# Task',
      'Instructions.',
      '',
      'dust'
    )

    expect(prompt).not.toContain('## Available Tools')
    expect(prompt.endsWith('\n\n')).toBe(false)
  })

  test('includes branch context when branch is specified', () => {
    const prompt = buildTaskPrompt(
      '.dust/tasks/task.md',
      '# Task',
      'Instructions.',
      '',
      'dust',
      'staging'
    )

    expect(prompt).toContain('You are working on the `staging` branch.')
    expect(prompt.startsWith('You are working on the `staging` branch.')).toBe(
      true
    )
  })

  test('omits branch context when branch is undefined', () => {
    const prompt = buildTaskPrompt(
      '.dust/tasks/task.md',
      '# Task',
      'Instructions.',
      '',
      'dust',
      undefined
    )

    expect(prompt).not.toContain('You are working on')
    expect(prompt.startsWith('Implement the task')).toBe(true)
  })

  test('omits branch context when branch is not provided', () => {
    const prompt = buildTaskPrompt(
      '.dust/tasks/task.md',
      '# Task',
      'Instructions.',
      '',
      'dust'
    )

    expect(prompt).not.toContain('You are working on')
    expect(prompt.startsWith('Implement the task')).toBe(true)
  })
})

describe('DUST_QUICK_REFERENCE', () => {
  test('contains key dust commands', () => {
    const reference = DUST_QUICK_REFERENCE('dust')
    expect(reference).toContain('dust ideas')
    expect(reference).toContain('dust principles')
    expect(reference).toContain('dust facts')
    expect(reference).toContain('dust help')
  })

  test('includes negative guidance about manual searching', () => {
    const reference = DUST_QUICK_REFERENCE('dust')
    expect(reference).toContain(
      'Use dust commands instead of manually searching `.dust/` directories'
    )
  })

  test('explains what dust is', () => {
    const reference = DUST_QUICK_REFERENCE('dust')
    expect(reference).toContain(
      'Dust stores project context in `.dust/` as markdown artifacts'
    )
  })

  test('includes CLI invocation explanation', () => {
    const reference = DUST_QUICK_REFERENCE('dust')
    expect(reference).toContain(
      'Dust is a CLI tool for managing development workflows'
    )
  })

  test('interpolates dustCommand parameter', () => {
    const referenceWithBunx = DUST_QUICK_REFERENCE('bunx dust')
    expect(referenceWithBunx).toContain('run dust commands using: `bunx dust`')

    const referenceWithNpx = DUST_QUICK_REFERENCE('npx dust')
    expect(referenceWithNpx).toContain('run dust commands using: `npx dust`')
  })

  test('mentions common invocation methods', () => {
    const reference = DUST_QUICK_REFERENCE('dust')
    expect(reference).toContain('bunx dust')
    expect(reference).toContain('npx dust')
  })
})

describe('buildContainerShellRunner', () => {
  function makeProc() {
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter
      stderr: EventEmitter
    }
    proc.stdout = new EventEmitter()
    proc.stderr = new EventEmitter()
    return proc
  }

  test('resolves with exitCode and combined output on close', async () => {
    const proc = makeProc()
    const spawnFn = asTestType<LoopDependencies['spawn']>(
      (_command: string, _spawnArguments: string[]) =>
        proc as ReturnType<LoopDependencies['spawn']>
    )
    const containerRuntime: ContainerRuntime = {
      name: 'docker',
      isAvailable: async () => true,
      buildImage: async () => ({ success: true }),
      runCommand: 'docker',
      hostAddress: 'host.docker.internal',
      buildRunArgs: () => ['run', '--rm', 'test-image'],
    }
    const docker = {
      imageTag: 'test-image',
      repoPath: '/project',
      homeDir: '/home',
    }
    const runner = buildContainerShellRunner(spawnFn, containerRuntime, docker)

    const resultPromise = runner.run('dust check', '/project')
    proc.stdout.emit('data', Buffer.from('stdout output'))
    proc.stderr.emit('data', Buffer.from('stderr output'))
    proc.emit('close', 0)

    const result = await resultPromise
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('stdout output')
    expect(result.output).toContain('stderr output')
  })

  test('resolves with exitCode 1 when close code is null', async () => {
    const proc = makeProc()
    const spawnFn = asTestType<LoopDependencies['spawn']>(
      (_command: string, _spawnArguments: string[]) =>
        proc as ReturnType<LoopDependencies['spawn']>
    )
    const containerRuntime: ContainerRuntime = {
      name: 'docker',
      isAvailable: async () => true,
      buildImage: async () => ({ success: true }),
      runCommand: 'docker',
      hostAddress: 'host.docker.internal',
      buildRunArgs: () => ['run', '--rm', 'test-image'],
    }
    const docker = {
      imageTag: 'test-image',
      repoPath: '/project',
      homeDir: '/home',
    }
    const runner = buildContainerShellRunner(spawnFn, containerRuntime, docker)

    const resultPromise = runner.run('dust check', '/project')
    proc.emit('close', null)

    const result = await resultPromise
    expect(result.exitCode).toBe(1)
  })

  test('resolves with exitCode 1 and error message on spawn error', async () => {
    const proc = makeProc()
    const spawnFn = asTestType<LoopDependencies['spawn']>(
      (_command: string, _spawnArguments: string[]) =>
        proc as ReturnType<LoopDependencies['spawn']>
    )
    const containerRuntime: ContainerRuntime = {
      name: 'docker',
      isAvailable: async () => true,
      buildImage: async () => ({ success: true }),
      runCommand: 'docker',
      hostAddress: 'host.docker.internal',
      buildRunArgs: () => ['run', '--rm', 'test-image'],
    }
    const docker = {
      imageTag: 'test-image',
      repoPath: '/project',
      homeDir: '/home',
    }
    const runner = buildContainerShellRunner(spawnFn, containerRuntime, docker)

    const resultPromise = runner.run('dust check', '/project')
    proc.emit('error', new Error('spawn failed'))

    const result = await resultPromise
    expect(result.exitCode).toBe(1)
    expect(result.output).toBe('spawn failed')
  })

  test('calls buildRunArgs with gitProxyUrl from docker config', () => {
    const buildRunArgsCalls: {
      imageTag: string
      repoPath: string
      homeDir: string
      gitProxyUrl?: string
    }[] = []
    const proc = makeProc()
    const spawnFn = asTestType<LoopDependencies['spawn']>(
      (_command: string, _spawnArguments: string[]) =>
        proc as ReturnType<LoopDependencies['spawn']>
    )
    const containerRuntime: ContainerRuntime = {
      name: 'docker',
      isAvailable: async () => true,
      buildImage: async () => ({ success: true }),
      runCommand: 'docker',
      hostAddress: 'host.docker.internal',
      buildRunArgs: config => {
        buildRunArgsCalls.push(config)
        return ['run', '--rm', config.imageTag]
      },
    }
    const docker = {
      imageTag: 'my-image',
      repoPath: '/workspace',
      homeDir: '/home/user',
      gitProxyUrl: 'http://proxy:3001',
    }
    buildContainerShellRunner(spawnFn, containerRuntime, docker)

    expect(buildRunArgsCalls).toHaveLength(1)
    expect(buildRunArgsCalls[0].imageTag).toBe('my-image')
    expect(buildRunArgsCalls[0].repoPath).toBe('/workspace')
    expect(buildRunArgsCalls[0].homeDir).toBe('/home/user')
    expect(buildRunArgsCalls[0].gitProxyUrl).toBe('http://proxy:3001')
  })

  test('spawns runCommand with buildRunArgs output and sh -c command', () => {
    const spawnCalls: { command: string; spawnArguments: string[] }[] = []
    const proc = makeProc()
    const spawnFn = asTestType<LoopDependencies['spawn']>(
      (command: string, spawnArguments: string[]) => {
        spawnCalls.push({ command, spawnArguments })
        return proc as ReturnType<LoopDependencies['spawn']>
      }
    )
    const containerRuntime: ContainerRuntime = {
      name: 'docker',
      isAvailable: async () => true,
      buildImage: async () => ({ success: true }),
      runCommand: 'docker',
      hostAddress: 'host.docker.internal',
      buildRunArgs: () => ['run', '--rm', 'test-image'],
    }
    const docker = {
      imageTag: 'test-image',
      repoPath: '/project',
      homeDir: '/home',
    }
    const runner = buildContainerShellRunner(spawnFn, containerRuntime, docker)

    runner.run('dust check', '/project')

    expect(spawnCalls).toHaveLength(1)
    expect(spawnCalls[0].command).toBe('docker')
    expect(spawnCalls[0].spawnArguments).toEqual([
      'run',
      '--rm',
      'test-image',
      'sh',
      '-c',
      'dust check',
    ])
  })
})

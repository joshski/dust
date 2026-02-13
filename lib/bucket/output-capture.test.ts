import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import { createLogBuffer, getLogLines } from './log-buffer'
import {
  createRepositoryLogBuffers,
  getOrCreateLogBuffer,
  invokeDustWithCapture,
  type OutputCaptureDependencies,
  parseClaudeJsonLine,
  removeLogBuffer,
  summarizeClaudeEvent,
} from './output-capture'

describe('parseClaudeJsonLine', () => {
  it('parses valid JSON', () => {
    const result = parseClaudeJsonLine('{"type":"text_delta","text":"hello"}')
    expect(result).toEqual({ type: 'text_delta', text: 'hello' })
  })

  it('returns null for empty string', () => {
    expect(parseClaudeJsonLine('')).toBeNull()
    expect(parseClaudeJsonLine('   ')).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    expect(parseClaudeJsonLine('not json')).toBeNull()
    expect(parseClaudeJsonLine('{broken')).toBeNull()
  })

  it('trims whitespace before parsing', () => {
    const result = parseClaudeJsonLine('  {"key":"value"}  ')
    expect(result).toEqual({ key: 'value' })
  })
})

describe('summarizeClaudeEvent', () => {
  it('summarizes text_delta event', () => {
    expect(
      summarizeClaudeEvent({ type: 'text_delta', text: 'hello world' })
    ).toBe('[text] hello world')
  })

  it('truncates long text', () => {
    const longText = 'a'.repeat(100)
    const summary = summarizeClaudeEvent({ type: 'text_delta', text: longText })
    expect(summary).toBe(`[text] ${'a'.repeat(77)}...`)
    expect(summary.length).toBe(87) // '[text] ' (7) + 77 + '...' (3) = 87
  })

  it('handles text_delta without text', () => {
    expect(summarizeClaudeEvent({ type: 'text_delta' })).toBe('[text_delta]')
  })

  it('summarizes tool_use event', () => {
    expect(summarizeClaudeEvent({ type: 'tool_use', name: 'Read' })).toBe(
      '[tool] Read'
    )
  })

  it('handles tool_use without name', () => {
    expect(summarizeClaudeEvent({ type: 'tool_use' })).toBe('[tool] unknown')
  })

  it('summarizes tool_result event', () => {
    expect(summarizeClaudeEvent({ type: 'tool_result' })).toBe('[tool_result]')
  })

  it('summarizes assistant_message event', () => {
    expect(summarizeClaudeEvent({ type: 'assistant_message' })).toBe(
      '[assistant_message]'
    )
  })

  it('summarizes result event', () => {
    expect(summarizeClaudeEvent({ type: 'result', subtype: 'success' })).toBe(
      '[result] success'
    )
    expect(summarizeClaudeEvent({ type: 'result', subtype: 'error' })).toBe(
      '[result] error'
    )
  })

  it('handles result without subtype', () => {
    expect(summarizeClaudeEvent({ type: 'result' })).toBe('[result] unknown')
  })

  it('handles unknown event types', () => {
    expect(summarizeClaudeEvent({ type: 'custom_event' })).toBe(
      '[custom_event]'
    )
    expect(summarizeClaudeEvent({})).toBe('[unknown]')
  })
})

describe('invokeDustWithCapture', () => {
  interface MockProcess {
    proc: ChildProcess
    stdoutEmitter: EventEmitter
    stderrEmitter: EventEmitter
  }

  interface SpawnCall {
    command: string
    spawnArguments: string[]
    options: unknown
  }

  function createMockProcess(): MockProcess {
    const stdoutEmitter = new EventEmitter()
    const stderrEmitter = new EventEmitter()
    const proc = new EventEmitter() as unknown as ChildProcess
    Object.assign(proc, {
      stdout: stdoutEmitter,
      stderr: stderrEmitter,
      pid: 12345,
    })

    return { proc, stdoutEmitter, stderrEmitter }
  }

  function createMockDependencies(mockProcess: MockProcess) {
    const stdoutLineEmitter = new EventEmitter()
    const stderrLineEmitter = new EventEmitter()
    const spawnCalls: SpawnCall[] = []

    const spawn = ((
      command: string,
      spawnArguments: string[],
      options: unknown
    ) => {
      spawnCalls.push({ command, spawnArguments, options })
      return mockProcess.proc
    }) as OutputCaptureDependencies['spawn']

    const createInterface = ((options: { input: EventEmitter }) => {
      if (options.input === mockProcess.stdoutEmitter) {
        return stdoutLineEmitter
      }
      return stderrLineEmitter
    }) as unknown as OutputCaptureDependencies['createInterface']

    return {
      spawn,
      createInterface,
      stdoutLineEmitter,
      stderrLineEmitter,
      spawnCalls,
    }
  }

  it('spawns dust with correct arguments', async () => {
    const mockProcess = createMockProcess()
    const dependencies = createMockDependencies(mockProcess)
    const logBuffer = createLogBuffer()

    const resultPromise = invokeDustWithCapture({
      repoPath: '/path/to/repo',
      dustCommand: 'npx dust',
      logBuffer,
      dependencies,
    })

    // Simulate successful completion
    mockProcess.proc.emit('close', 0, null)

    const result = await resultPromise

    expect(dependencies.spawnCalls).toHaveLength(1)
    const call = dependencies.spawnCalls[0]
    expect(call.command).toBe('npx')
    expect(call.spawnArguments).toEqual([
      'dust',
      'loop',
      'claude',
      '--max-iterations',
      '1',
    ])
    expect(call.options).toMatchObject({
      cwd: '/path/to/repo',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const env = (call.options as { env: { DUST_UNATTENDED: string } }).env
    expect(env.DUST_UNATTENDED).toBe('1')
    expect(result.success).toBe(true)
    expect(result.exitCode).toBe(0)
  })

  it('captures and parses JSON stdout', async () => {
    const mockProcess = createMockProcess()
    const dependencies = createMockDependencies(mockProcess)
    const logBuffer = createLogBuffer()
    const events: Record<string, unknown>[] = []

    const resultPromise = invokeDustWithCapture({
      repoPath: '/path/to/repo',
      dustCommand: 'bin/dust',
      logBuffer,
      onEvent: event => events.push(event),
      dependencies,
    })

    // Emit JSON events via the readline mock
    dependencies.stdoutLineEmitter.emit(
      'line',
      '{"type":"text_delta","text":"hello"}'
    )
    dependencies.stdoutLineEmitter.emit(
      'line',
      '{"type":"tool_use","name":"Read"}'
    )

    mockProcess.proc.emit('close', 0, null)

    await resultPromise

    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ type: 'text_delta', text: 'hello' })
    expect(events[1]).toEqual({ type: 'tool_use', name: 'Read' })

    const lines = getLogLines(logBuffer)
    expect(lines.some(l => l.text === '[text] hello')).toBe(true)
    expect(lines.some(l => l.text === '[tool] Read')).toBe(true)
  })

  it('captures non-JSON stdout as-is', async () => {
    const mockProcess = createMockProcess()
    const dependencies = createMockDependencies(mockProcess)
    const logBuffer = createLogBuffer()

    const resultPromise = invokeDustWithCapture({
      repoPath: '/path/to/repo',
      dustCommand: 'bin/dust',
      logBuffer,
      dependencies,
    })

    dependencies.stdoutLineEmitter.emit('line', 'plain text output')

    mockProcess.proc.emit('close', 0, null)

    await resultPromise

    const lines = getLogLines(logBuffer)
    expect(lines.some(l => l.text === 'plain text output')).toBe(true)
  })

  it('captures stderr', async () => {
    const mockProcess = createMockProcess()
    const dependencies = createMockDependencies(mockProcess)
    const logBuffer = createLogBuffer()

    const resultPromise = invokeDustWithCapture({
      repoPath: '/path/to/repo',
      dustCommand: 'bin/dust',
      logBuffer,
      dependencies,
    })

    dependencies.stderrLineEmitter.emit('line', 'error message')

    mockProcess.proc.emit('close', 1, null)

    const result = await resultPromise

    expect(result.success).toBe(false)
    expect(result.exitCode).toBe(1)

    const lines = getLogLines(logBuffer)
    const errorLine = lines.find(l => l.text === 'error message')
    expect(errorLine).toBeDefined()
    expect(errorLine?.stream).toBe('stderr')
  })

  it('handles process error', async () => {
    const mockProcess = createMockProcess()
    const dependencies = createMockDependencies(mockProcess)
    const logBuffer = createLogBuffer()

    const resultPromise = invokeDustWithCapture({
      repoPath: '/path/to/repo',
      dustCommand: 'bin/dust',
      logBuffer,
      dependencies,
    })

    mockProcess.proc.emit('error', new Error('spawn failed'))

    const result = await resultPromise

    expect(result.success).toBe(false)
    expect(result.error).toBe('spawn failed')

    const lines = getLogLines(logBuffer)
    expect(lines.some(l => l.text.includes('spawn failed'))).toBe(true)
  })

  it('handles signal termination', async () => {
    const mockProcess = createMockProcess()
    const dependencies = createMockDependencies(mockProcess)
    const logBuffer = createLogBuffer()

    const resultPromise = invokeDustWithCapture({
      repoPath: '/path/to/repo',
      dustCommand: 'bin/dust',
      logBuffer,
      dependencies,
    })

    mockProcess.proc.emit('close', null, 'SIGTERM')

    const result = await resultPromise

    expect(result.success).toBe(false)
    expect(result.exitCode).toBeNull()
    expect(result.signal).toBe('SIGTERM')
  })

  it('handles spawn throwing synchronously', async () => {
    const logBuffer = createLogBuffer()

    const throwingSpawn = (() => {
      throw new Error('command not found')
    }) as OutputCaptureDependencies['spawn']

    const result = await invokeDustWithCapture({
      repoPath: '/path/to/repo',
      dustCommand: 'nonexistent-command',
      logBuffer,
      dependencies: {
        spawn: throwingSpawn,
        createInterface: (() =>
          new EventEmitter()) as unknown as OutputCaptureDependencies['createInterface'],
      },
    })

    expect(result.success).toBe(false)
    expect(result.exitCode).toBeNull()
    expect(result.signal).toBeNull()
    expect(result.error).toBe('command not found')

    const lines = getLogLines(logBuffer)
    expect(lines.some(l => l.text.includes('spawn error'))).toBe(true)
    expect(lines.some(l => l.text.includes('command not found'))).toBe(true)
  })

  it('handles spawn throwing non-Error', async () => {
    const logBuffer = createLogBuffer()

    const throwingSpawn = (() => {
      throw 'string error'
    }) as OutputCaptureDependencies['spawn']

    const result = await invokeDustWithCapture({
      repoPath: '/path/to/repo',
      dustCommand: 'nonexistent-command',
      logBuffer,
      dependencies: {
        spawn: throwingSpawn,
        createInterface: (() =>
          new EventEmitter()) as unknown as OutputCaptureDependencies['createInterface'],
      },
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('string error')
  })
})

describe('RepositoryLogBuffers', () => {
  it('creates empty collection', () => {
    const collection = createRepositoryLogBuffers()
    expect(collection.buffers.size).toBe(0)
  })

  it('creates buffer for new repository', () => {
    const collection = createRepositoryLogBuffers()
    const buffer = getOrCreateLogBuffer(collection, 'my-repo')

    expect(buffer).toBeDefined()
    expect(buffer.lines).toEqual([])
    expect(collection.buffers.size).toBe(1)
  })

  it('returns same buffer for same repository', () => {
    const collection = createRepositoryLogBuffers()
    const buffer1 = getOrCreateLogBuffer(collection, 'my-repo')
    const buffer2 = getOrCreateLogBuffer(collection, 'my-repo')

    expect(buffer1).toBe(buffer2)
    expect(collection.buffers.size).toBe(1)
  })

  it('creates separate buffers for different repositories', () => {
    const collection = createRepositoryLogBuffers()
    const buffer1 = getOrCreateLogBuffer(collection, 'repo-1')
    const buffer2 = getOrCreateLogBuffer(collection, 'repo-2')

    expect(buffer1).not.toBe(buffer2)
    expect(collection.buffers.size).toBe(2)
  })

  it('removes repository buffer', () => {
    const collection = createRepositoryLogBuffers()
    getOrCreateLogBuffer(collection, 'my-repo')
    expect(collection.buffers.size).toBe(1)

    removeLogBuffer(collection, 'my-repo')
    expect(collection.buffers.size).toBe(0)
  })

  it('handles removing non-existent buffer', () => {
    const collection = createRepositoryLogBuffers()
    // Should not throw
    removeLogBuffer(collection, 'non-existent')
    expect(collection.buffers.size).toBe(0)
  })
})

import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { PassThrough } from 'node:stream'
import { describe, expect, test } from 'vitest'
import {
  createProcessEventSourceDependencies,
  createReadlineStub,
  createSpawnStub,
} from '../test/process-event-source-stubs'
import {
  buildDockerRunArguments,
  defaultDependencies,
  type EventSourceDependencies,
  spawnCodex,
} from './spawn-codex'

type EventListener = (...values: unknown[]) => void

function createMockDependencies(
  lines: string[],
  exitCode: number | null = 0,
  errorToThrow?: Error,
  stderrData?: string
): EventSourceDependencies {
  return createProcessEventSourceDependencies({
    lines,
    exitCode,
    errorToThrow,
    stderrData,
  })
}

describe('spawnCodex', () => {
  test('defaultDependencies uses real node implementations', () => {
    expect(defaultDependencies.spawn).toBe(spawn)
    expect(defaultDependencies.createInterface).toBe(createInterface)
  })

  test('yields parsed JSON events', async () => {
    const dependencies = createMockDependencies([
      '{"type": "message", "content": "hello"}',
      '{"type": "done"}',
    ])

    const events = []
    for await (const event of spawnCodex('test prompt', {}, dependencies)) {
      events.push(event)
    }

    expect(events).toEqual([
      { type: 'message', content: 'hello' },
      { type: 'done' },
    ])
  })

  test('skips empty lines', async () => {
    const dependencies = createMockDependencies([
      '{"type": "event1"}',
      '',
      '   ',
      '{"type": "event2"}',
    ])

    const events = []
    for await (const event of spawnCodex('test', {}, dependencies)) {
      events.push(event)
    }

    expect(events).toEqual([{ type: 'event1' }, { type: 'event2' }])
  })

  test('skips malformed JSON lines', async () => {
    const dependencies = createMockDependencies([
      '{"type": "valid"}',
      'not json',
      '{"type": "also valid"}',
    ])

    const events = []
    for await (const event of spawnCodex('test', {}, dependencies)) {
      events.push(event)
    }

    expect(events).toEqual([{ type: 'valid' }, { type: 'also valid' }])
  })

  test('rejects on non-zero exit code', async () => {
    const dependencies = createMockDependencies(['{"type": "event"}'], 1)

    const consume = async () => {
      for await (const _ of spawnCodex('test', {}, dependencies)) {
        // consume
      }
    }

    await expect(consume()).rejects.toThrow('codex exited with code 1')
  })

  test('passes correct CLI arguments', async () => {
    let capturedArguments: string[] = []

    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub((_cmd: string, spawnArguments: string[]) => {
        capturedArguments = spawnArguments
        return {
          stdout: new PassThrough(),
          killed: false,
          kill: () => true,
          on(event: string, listener: EventListener) {
            if (event === 'close') setTimeout(() => listener(0), 0)
            return this
          },
        }
      }),
      createInterface: createReadlineStub([]),
    }

    for await (const _ of spawnCodex(
      'my prompt',
      { cwd: '/some/path' },
      dependencies
    )) {
      // consume
    }

    expect(capturedArguments).toContain('exec')
    expect(capturedArguments).toContain('my prompt')
    expect(capturedArguments).toContain('--json')
    expect(capturedArguments).toContain('--yolo')
    expect(capturedArguments).toContain('--cd')
    expect(capturedArguments).toContain('/some/path')
  })

  test('does not pass --cd when cwd is not set', async () => {
    let capturedArguments: string[] = []

    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub((_cmd: string, spawnArguments: string[]) => {
        capturedArguments = spawnArguments
        return {
          stdout: new PassThrough(),
          killed: false,
          kill: () => true,
          on(event: string, listener: EventListener) {
            if (event === 'close') setTimeout(() => listener(0), 0)
            return this
          },
        }
      }),
      createInterface: createReadlineStub([]),
    }

    for await (const _ of spawnCodex('test prompt', {}, dependencies)) {
      // consume
    }

    expect(capturedArguments).not.toContain('--cd')
  })

  test('spawns docker when docker config is provided', async () => {
    let capturedCommand = ''
    let capturedArguments: string[] = []

    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub((command: string, spawnArguments: string[]) => {
        capturedCommand = command
        capturedArguments = spawnArguments
        return {
          stdout: new PassThrough(),
          killed: false,
          kill: () => true,
          on(event: string, listener: EventListener) {
            if (event === 'close') setTimeout(() => listener(0), 0)
            return this
          },
        }
      }),
      createInterface: createReadlineStub([]),
    }

    for await (const _ of spawnCodex(
      'my prompt',
      {
        docker: {
          imageTag: 'dust-agent-test',
          repoPath: '/project',
          homeDir: '/home/user',
          gitProxyUrl: 'http://host.docker.internal:3001',
        },
      },
      dependencies
    )) {
      // consume
    }

    expect(capturedCommand).toBe('docker')
    expect(capturedArguments).toContain('run')
    expect(capturedArguments).toContain('dust-agent-test')
    expect(capturedArguments).toContain('codex')
    expect(capturedArguments).toContain('exec')
    expect(capturedArguments).toContain('my prompt')
    expect(capturedArguments).toContain(
      'GIT_PROXY_URL=http://host.docker.internal:3001'
    )
  })

  test('maps cwd to /workspace when running codex in docker', async () => {
    let capturedArguments: string[] = []

    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub((_command: string, spawnArguments: string[]) => {
        capturedArguments = spawnArguments
        return {
          stdout: new PassThrough(),
          killed: false,
          kill: () => true,
          on(event: string, listener: EventListener) {
            if (event === 'close') setTimeout(() => listener(0), 0)
            return this
          },
        }
      }),
      createInterface: createReadlineStub([]),
    }

    for await (const _ of spawnCodex(
      'my prompt',
      {
        cwd: '/host/path/that/does/not/exist/in/container',
        docker: {
          imageTag: 'dust-agent-test',
          repoPath: '/project',
          homeDir: '/home/user',
        },
      },
      dependencies
    )) {
      // consume
    }

    const cdIndex = capturedArguments.indexOf('--cd')
    expect(cdIndex).toBeGreaterThanOrEqual(0)
    expect(capturedArguments[cdIndex + 1]).toBe('/workspace')
    expect(capturedArguments).not.toContain(
      '/host/path/that/does/not/exist/in/container'
    )
  })

  test('includes stderr in error message on non-zero exit', async () => {
    const dependencies = createMockDependencies(
      ['{"type": "event"}'],
      1,
      undefined,
      'Something went wrong'
    )

    const consume = async () => {
      for await (const _ of spawnCodex('test', {}, dependencies)) {
        // consume
      }
    }

    await expect(consume()).rejects.toThrow(
      'codex exited with code 1: Something went wrong'
    )
  })

  test('handles process error', async () => {
    const dependencies = createMockDependencies(
      [],
      0,
      new Error('spawn failed')
    )

    const consume = async () => {
      for await (const _ of spawnCodex('test', {}, dependencies)) {
        // consume
      }
    }

    await expect(consume()).rejects.toThrow('spawn failed')
  })

  test('throws if stdout is null', async () => {
    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub(() => ({
        stdout: null,
        killed: false,
        kill: () => true,
        on() {
          return this
        },
      })),
      createInterface: createReadlineStub([]),
    }

    const consume = async () => {
      for await (const _ of spawnCodex('test', {}, dependencies)) {
        // consume
      }
    }

    await expect(consume()).rejects.toThrow(
      'Failed to get stdout from codex process'
    )
  })

  test('kills process immediately when signal is already aborted', async () => {
    let killCalled = false
    const controller = new AbortController()
    controller.abort()

    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub(() => {
        return {
          killed: false,
          kill() {
            killCalled = true
            this.killed = true
            return true
          },
          stdout: new PassThrough(),
          stderr: {
            on() {
              return this
            },
          },
          on(event: string, listener: EventListener) {
            if (event === 'close') setTimeout(() => listener(0), 0)
            return this
          },
        }
      }),
      createInterface: () => ({
        close: () => {},
        async *[Symbol.asyncIterator]() {
          // no lines
        },
      }),
    }

    for await (const _ of spawnCodex(
      'test',
      { signal: controller.signal },
      dependencies
    )) {
      // consume
    }

    expect(killCalled).toBe(true)
  })

  test('registers abort handler and kills process when signal aborts', async () => {
    let killCalled = false
    const closeListeners: EventListener[] = []
    const controller = new AbortController()

    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub(() => {
        return {
          killed: false,
          kill() {
            killCalled = true
            this.killed = true
            for (const listener of closeListeners) listener(0)
            return true
          },
          stdout: new PassThrough(),
          stderr: {
            on() {
              return this
            },
          },
          on(event: string, listener: EventListener) {
            if (event === 'close') {
              closeListeners.push(listener)
            }
            return this
          },
        }
      }),
      createInterface: () => ({
        close: () => {},
        async *[Symbol.asyncIterator]() {
          yield* []
          await new Promise(resolve => setTimeout(resolve, 0))
        },
      }),
    }

    const consume = (async () => {
      for await (const _ of spawnCodex(
        'test',
        { signal: controller.signal },
        dependencies
      )) {
        // consume
      }
    })()

    controller.abort()
    await consume
    expect(killCalled).toBe(true)
  })

  test('does not call kill when signal aborts an already-killed process', async () => {
    let killCallCount = 0
    const controller = new AbortController()
    controller.abort()

    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub(() => {
        return {
          killed: true,
          kill() {
            killCallCount++
            return true
          },
          stdout: new PassThrough(),
          stderr: {
            on() {
              return this
            },
          },
          on(event: string, listener: EventListener) {
            if (event === 'close') setTimeout(() => listener(0), 0)
            return this
          },
        }
      }),
      createInterface: () => ({
        close: () => {},
        async *[Symbol.asyncIterator]() {
          // no lines
        },
      }),
    }

    for await (const _ of spawnCodex(
      'test',
      { signal: controller.signal },
      dependencies
    )) {
      // consume
    }

    expect(killCallCount).toBe(0)
  })
})

describe('buildDockerRunArguments', () => {
  test('passes through OPENAI_API_KEY from process.env when not in env', () => {
    const originalKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'test-openai-key'

    const dockerArguments = buildDockerRunArguments(
      {
        imageTag: 'dust-agent-test',
        repoPath: '/project',
        homeDir: '/home/user',
      },
      ['exec', 'test prompt', '--json', '--yolo'],
      {}
    )

    expect(dockerArguments).toContain('OPENAI_API_KEY=test-openai-key')

    if (originalKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = originalKey
  })

  test('uses explicit OPENAI_API_KEY from env over process.env', () => {
    const originalKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'from-process-env'

    const dockerArguments = buildDockerRunArguments(
      {
        imageTag: 'dust-agent-test',
        repoPath: '/project',
        homeDir: '/home/user',
      },
      ['exec', 'test prompt', '--json', '--yolo'],
      { OPENAI_API_KEY: 'from-env-param' }
    )

    const matches = dockerArguments.filter(argument =>
      argument.includes('OPENAI_API_KEY')
    )
    expect(matches).toEqual(['OPENAI_API_KEY=from-env-param'])

    if (originalKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = originalKey
  })

  test('mounts CODEX_HOME from process.env when set', () => {
    const originalCodexHome = process.env.CODEX_HOME
    process.env.CODEX_HOME = '/custom/codex-home'

    const dockerArguments = buildDockerRunArguments(
      {
        imageTag: 'dust-agent-test',
        repoPath: '/project',
        homeDir: '/home/user',
      },
      ['exec', 'test prompt', '--json', '--yolo'],
      {}
    )

    expect(dockerArguments).toContain('/custom/codex-home:/home/user/.codex')
    expect(dockerArguments).toContain('CODEX_HOME=/home/user/.codex')

    if (originalCodexHome === undefined) delete process.env.CODEX_HOME
    else process.env.CODEX_HOME = originalCodexHome
  })

  test('uses caller-provided git identity over defaults', () => {
    const dockerArguments = buildDockerRunArguments(
      {
        imageTag: 'dust-agent-test',
        repoPath: '/project',
        homeDir: '/home/user',
      },
      ['exec', 'test prompt', '--json', '--yolo'],
      { GIT_AUTHOR_NAME: 'Custom Name' }
    )

    expect(dockerArguments).toContain('GIT_AUTHOR_NAME=Custom Name')
    expect(dockerArguments).not.toContain('GIT_AUTHOR_NAME=Dust Agent')
    expect(dockerArguments).toContain('GIT_COMMITTER_NAME=Dust Agent')
  })
})

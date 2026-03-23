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
  generateApiKeyHelperSettings,
  spawnClaudeCode,
} from './spawn-claude-code'

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

describe('spawnClaudeCode', () => {
  test('defaultDependencies uses real node implementations', () => {
    expect(defaultDependencies.spawn).toBe(spawn)
    expect(defaultDependencies.createInterface).toBe(createInterface)
  })

  test('yields parsed JSON events', async () => {
    const dependencies = createMockDependencies([
      '{"type": "stream_event", "data": "hello"}',
      '{"type": "result", "subtype": "success"}',
    ])

    const events = []
    for await (const event of spawnClaudeCode(
      'test prompt',
      {},
      dependencies
    )) {
      events.push(event)
    }

    expect(events).toEqual([
      { type: 'stream_event', data: 'hello' },
      { type: 'result', subtype: 'success' },
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
    for await (const event of spawnClaudeCode('test', {}, dependencies)) {
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
    for await (const event of spawnClaudeCode('test', {}, dependencies)) {
      events.push(event)
    }

    expect(events).toEqual([{ type: 'valid' }, { type: 'also valid' }])
  })

  test('rejects on non-zero exit code', async () => {
    const dependencies = createMockDependencies(['{"type": "event"}'], 1)

    const consume = async () => {
      for await (const _ of spawnClaudeCode('test', {}, dependencies)) {
        // consume
      }
    }

    await expect(consume()).rejects.toThrow('claude exited with code 1')
  })

  test('passes options as CLI arguments', async () => {
    let capturedArguments: string[] = []

    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub((_cmd: string, spawnArguments: string[]) => {
        capturedArguments = spawnArguments
        return {
          stdout: new PassThrough(),
          on(event: string, listener: EventListener) {
            if (event === 'close') setTimeout(() => listener(0), 0)
            return this
          },
        }
      }),
      createInterface: createReadlineStub([]),
    }

    for await (const _ of spawnClaudeCode(
      'my prompt',
      {
        maxTurns: 5,
        model: 'claude-3',
        allowedTools: ['Read', 'Write'],
        systemPrompt: 'Be helpful',
        sessionId: 'sess-123',
      },
      dependencies
    )) {
      // consume
    }

    expect(capturedArguments).toContain('-p')
    expect(capturedArguments).toContain('my prompt')
    expect(capturedArguments).toContain('--max-turns')
    expect(capturedArguments).toContain('5')
    expect(capturedArguments).toContain('--model')
    expect(capturedArguments).toContain('claude-3')
    expect(capturedArguments).toContain('--allowedTools')
    expect(capturedArguments).toContain('Read')
    expect(capturedArguments).toContain('Write')
    expect(capturedArguments).toContain('--system-prompt')
    expect(capturedArguments).toContain('Be helpful')
    expect(capturedArguments).toContain('--session-id')
    expect(capturedArguments).toContain('sess-123')
  })

  test('passes dangerously-skip-permissions flag when enabled', async () => {
    let capturedArguments: string[] = []

    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub((_cmd: string, spawnArguments: string[]) => {
        capturedArguments = spawnArguments
        return {
          stdout: new PassThrough(),
          on(event: string, listener: EventListener) {
            if (event === 'close') setTimeout(() => listener(0), 0)
            return this
          },
        }
      }),
      createInterface: createReadlineStub([]),
    }

    for await (const _ of spawnClaudeCode(
      'test prompt',
      { dangerouslySkipPermissions: true },
      dependencies
    )) {
      // consume
    }

    expect(capturedArguments).toContain('--dangerously-skip-permissions')
  })

  test('includes stderr in error message on non-zero exit', async () => {
    const dependencies = createMockDependencies(
      ['{"type": "event"}'],
      1,
      undefined,
      'Something went wrong'
    )

    const consume = async () => {
      for await (const _ of spawnClaudeCode('test', {}, dependencies)) {
        // consume
      }
    }

    await expect(consume()).rejects.toThrow(
      'claude exited with code 1: Something went wrong'
    )
  })

  test('handles process error', async () => {
    const dependencies = createMockDependencies(
      [],
      0,
      new Error('spawn failed')
    )

    const consume = async () => {
      for await (const _ of spawnClaudeCode('test', {}, dependencies)) {
        // consume
      }
    }

    await expect(consume()).rejects.toThrow('spawn failed')
  })

  test('throws if stdout is null', async () => {
    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub(() => ({
        stdout: null,
        on() {
          return this
        },
      })),
      createInterface: createReadlineStub([]),
    }

    const consume = async () => {
      for await (const _ of spawnClaudeCode('test', {}, dependencies)) {
        // consume
      }
    }

    await expect(consume()).rejects.toThrow(
      'Failed to get stdout from claude process'
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
      createInterface: createReadlineStub([]),
    }

    for await (const _ of spawnClaudeCode(
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
      for await (const _ of spawnClaudeCode(
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
      createInterface: createReadlineStub([]),
    }

    for await (const _ of spawnClaudeCode(
      'test',
      { signal: controller.signal },
      dependencies
    )) {
      // consume
    }
    expect(killCallCount).toBe(0)
  })

  test('spawns docker when docker config is provided', async () => {
    let capturedCommand: string | undefined
    let capturedArgs: string[] | undefined

    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub((cmd: string, spawnArgs: string[]) => {
        capturedCommand = cmd
        capturedArgs = spawnArgs
        return {
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
      createInterface: createReadlineStub([]),
    }

    for await (const _ of spawnClaudeCode(
      'test prompt',
      {
        docker: {
          imageTag: 'dust-agent-test',
          repoPath: '/home/user/project',
          homeDir: '/home/user',
        },
      },
      dependencies
    )) {
      // consume
    }

    expect(capturedCommand).toBe('docker')
    expect(capturedArgs).toContain('run')
    expect(capturedArgs).toContain('--rm')
    expect(capturedArgs).toContain('-i')
    expect(capturedArgs).toContain('/home/user/project:/workspace')
    // When not using API proxy, .claude and .claude.json are mounted
    expect(capturedArgs).toContain('/home/user/.claude:/home/user/.claude')
    expect(capturedArgs).toContain(
      '/home/user/.claude.json:/home/user/.claude.json'
    )
    expect(capturedArgs).toContain('HOME=/home/user')
    expect(capturedArgs).toContain('dust-agent-test')
    expect(capturedArgs).toContain('claude')
    expect(capturedArgs).toContain('-p')
    expect(capturedArgs).toContain('test prompt')
  })

  test('uses custom runCommand when provided in docker config', async () => {
    let capturedCommand: string | undefined

    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub((cmd: string) => {
        capturedCommand = cmd
        return {
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
      createInterface: createReadlineStub([]),
    }

    for await (const _ of spawnClaudeCode(
      'test prompt',
      {
        docker: {
          runCommand: 'container',
          imageTag: 'dust-agent-test',
          repoPath: '/home/user/project',
          homeDir: '/home/user',
        },
      },
      dependencies
    )) {
      // consume
    }

    expect(capturedCommand).toBe('container')
  })

  test('does not mount ~/.ssh or ~/.gitconfig in docker container', async () => {
    let capturedArgs: string[] | undefined

    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub((_cmd: string, spawnArgs: string[]) => {
        capturedArgs = spawnArgs
        return {
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
      createInterface: createReadlineStub([]),
    }

    for await (const _ of spawnClaudeCode(
      'test prompt',
      {
        docker: {
          imageTag: 'dust-agent-test',
          repoPath: '/home/user/project',
          homeDir: '/home/user',
        },
      },
      dependencies
    )) {
      // consume
    }

    // Verify ~/.ssh is NOT mounted
    const sshMount = capturedArgs?.find(arg => arg.includes('.ssh'))
    expect(sshMount).toBeUndefined()

    // Verify ~/.gitconfig is NOT mounted
    const gitconfigMount = capturedArgs?.find(arg => arg.includes('.gitconfig'))
    expect(gitconfigMount).toBeUndefined()
  })

  test('passes environment variables to docker container', async () => {
    let capturedArgs: string[] | undefined

    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub((_cmd: string, spawnArgs: string[]) => {
        capturedArgs = spawnArgs
        return {
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
      createInterface: createReadlineStub([]),
    }

    for await (const _ of spawnClaudeCode(
      'test prompt',
      {
        docker: {
          imageTag: 'dust-agent-test',
          repoPath: '/home/user/project',
          homeDir: '/home/user',
        },
        env: { DUST_UNATTENDED: '1', MY_VAR: 'value' },
      },
      dependencies
    )) {
      // consume
    }

    expect(capturedArgs).toContain('-e')
    expect(capturedArgs).toContain('DUST_UNATTENDED=1')
    expect(capturedArgs).toContain('MY_VAR=value')
  })

  test('passes through CLAUDE_CODE_OAUTH_TOKEN and OPENAI_API_KEY from process.env', async () => {
    const originalClaude = process.env.CLAUDE_CODE_OAUTH_TOKEN
    const originalOpenai = process.env.OPENAI_API_KEY
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 'test-oauth-token'
    process.env.OPENAI_API_KEY = 'test-openai-key'

    let capturedArgs: string[] | undefined

    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub((_cmd: string, spawnArgs: string[]) => {
        capturedArgs = spawnArgs
        return {
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
      createInterface: createReadlineStub([]),
    }

    for await (const _ of spawnClaudeCode(
      'test prompt',
      {
        docker: {
          imageTag: 'dust-agent-test',
          repoPath: '/home/user/project',
          homeDir: '/home/user',
        },
      },
      dependencies
    )) {
      // consume
    }

    expect(capturedArgs).toContain('CLAUDE_CODE_OAUTH_TOKEN=test-oauth-token')
    expect(capturedArgs).toContain('OPENAI_API_KEY=test-openai-key')

    // Restore
    if (originalClaude === undefined) delete process.env.CLAUDE_CODE_OAUTH_TOKEN
    else process.env.CLAUDE_CODE_OAUTH_TOKEN = originalClaude
    if (originalOpenai === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = originalOpenai
  })

  test('does not mount ~/.dust directory in docker container', async () => {
    let capturedArgs: string[] | undefined

    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub((_cmd: string, spawnArgs: string[]) => {
        capturedArgs = spawnArgs
        return {
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
      createInterface: createReadlineStub([]),
    }

    for await (const _ of spawnClaudeCode(
      'test prompt',
      {
        docker: {
          imageTag: 'dust-agent-test',
          repoPath: '/home/user/project',
          homeDir: '/home/user',
        },
      },
      dependencies
    )) {
      // consume
    }

    // Verify ~/.dust (containing credentials.json) is NOT mounted
    const dustMount = capturedArgs?.find(arg => arg.includes('/.dust'))
    expect(dustMount).toBeUndefined()
  })

  test('does not pass DUST_BUCKET_TOKEN to docker container', async () => {
    const originalToken = process.env.DUST_BUCKET_TOKEN
    process.env.DUST_BUCKET_TOKEN = 'secret-bucket-token'

    let capturedArgs: string[] | undefined

    const dependencies: EventSourceDependencies = {
      spawn: createSpawnStub((_cmd: string, spawnArgs: string[]) => {
        capturedArgs = spawnArgs
        return {
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
      createInterface: createReadlineStub([]),
    }

    for await (const _ of spawnClaudeCode(
      'test prompt',
      {
        docker: {
          imageTag: 'dust-agent-test',
          repoPath: '/home/user/project',
          homeDir: '/home/user',
        },
      },
      dependencies
    )) {
      // consume
    }

    // Verify DUST_BUCKET_TOKEN is NOT passed to the container
    const bucketToken = capturedArgs?.find(arg =>
      arg.includes('DUST_BUCKET_TOKEN')
    )
    expect(bucketToken).toBeUndefined()

    // Restore
    if (originalToken === undefined) delete process.env.DUST_BUCKET_TOKEN
    else process.env.DUST_BUCKET_TOKEN = originalToken
  })
})

describe('buildDockerRunArguments', () => {
  test('does not mount .claude files when claudeApiProxyUrl is set', () => {
    const dockerArguments = buildDockerRunArguments(
      {
        imageTag: 'dust-agent-test',
        repoPath: '/home/user/project',
        homeDir: '/home/user',
        claudeApiProxyUrl: 'http://host.docker.internal:3002',
      },
      ['-p', 'test'],
      {}
    )

    // Should NOT contain .claude mounts
    const claudeMount = dockerArguments.find(arg =>
      arg.includes('.claude:/home/user/.claude')
    )
    expect(claudeMount).toBeUndefined()

    const claudeJsonMount = dockerArguments.find(arg =>
      arg.includes('.claude.json')
    )
    expect(claudeJsonMount).toBeUndefined()
  })

  test('sets ANTHROPIC_BASE_URL when claudeApiProxyUrl is set', () => {
    const dockerArguments = buildDockerRunArguments(
      {
        imageTag: 'dust-agent-test',
        repoPath: '/home/user/project',
        homeDir: '/home/user',
        claudeApiProxyUrl: 'http://host.docker.internal:3002',
      },
      ['-p', 'test'],
      {}
    )

    expect(dockerArguments).toContain(
      'ANTHROPIC_BASE_URL=http://host.docker.internal:3002'
    )
  })

  test('does not pass CLAUDE_CODE_OAUTH_TOKEN when claudeApiProxyUrl is set', () => {
    const originalToken = process.env.CLAUDE_CODE_OAUTH_TOKEN
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 'test-oauth-token'

    const dockerArguments = buildDockerRunArguments(
      {
        imageTag: 'dust-agent-test',
        repoPath: '/home/user/project',
        homeDir: '/home/user',
        claudeApiProxyUrl: 'http://host.docker.internal:3002',
      },
      ['-p', 'test'],
      {}
    )

    // Should NOT contain CLAUDE_CODE_OAUTH_TOKEN
    const oauthArg = dockerArguments.find(arg =>
      arg.includes('CLAUDE_CODE_OAUTH_TOKEN')
    )
    expect(oauthArg).toBeUndefined()

    // Restore
    if (originalToken === undefined) delete process.env.CLAUDE_CODE_OAUTH_TOKEN
    else process.env.CLAUDE_CODE_OAUTH_TOKEN = originalToken
  })

  test('still passes OPENAI_API_KEY when claudeApiProxyUrl is set', () => {
    const originalKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'test-openai-key'

    const dockerArguments = buildDockerRunArguments(
      {
        imageTag: 'dust-agent-test',
        repoPath: '/home/user/project',
        homeDir: '/home/user',
        claudeApiProxyUrl: 'http://host.docker.internal:3002',
      },
      ['-p', 'test'],
      {}
    )

    expect(dockerArguments).toContain('OPENAI_API_KEY=test-openai-key')

    // Restore
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = originalKey
  })

  test('does not override token already present in env', () => {
    const originalKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'from-process-env'

    const dockerArguments = buildDockerRunArguments(
      {
        imageTag: 'dust-agent-test',
        repoPath: '/home/user/project',
        homeDir: '/home/user',
      },
      ['-p', 'test'],
      { OPENAI_API_KEY: 'from-env-param' }
    )

    // The env param value should be used, not duplicated by pass-through
    const matches = dockerArguments.filter(arg =>
      arg.includes('OPENAI_API_KEY')
    )
    expect(matches).toEqual(['OPENAI_API_KEY=from-env-param'])

    // Restore
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = originalKey
  })

  test('configures git URL rewriting when gitProxyUrl is set', () => {
    const dockerArguments = buildDockerRunArguments(
      {
        imageTag: 'dust-agent-test',
        repoPath: '/home/user/project',
        homeDir: '/home/user',
        gitProxyUrl: 'http://host.docker.internal:3001',
      },
      ['-p', 'test'],
      {}
    )

    expect(dockerArguments).toContain(
      'GIT_PROXY_URL=http://host.docker.internal:3001'
    )
    expect(dockerArguments).toContain('GIT_CONFIG_COUNT=2')
    expect(dockerArguments).toContain(
      'GIT_CONFIG_KEY_0=url.http://host.docker.internal:3001/github.com/.insteadOf'
    )
    expect(dockerArguments).toContain('GIT_CONFIG_VALUE_0=https://github.com/')
    expect(dockerArguments).toContain(
      'GIT_CONFIG_KEY_1=url.http://host.docker.internal:3001/github.com/.insteadOf'
    )
    expect(dockerArguments).toContain('GIT_CONFIG_VALUE_1=git@github.com:')
  })

  test('sets default git identity env vars', () => {
    const dockerArguments = buildDockerRunArguments(
      {
        imageTag: 'dust-agent-test',
        repoPath: '/home/user/project',
        homeDir: '/home/user',
      },
      ['-p', 'test'],
      {}
    )

    expect(dockerArguments).toContain('GIT_AUTHOR_NAME=Dust Agent')
    expect(dockerArguments).toContain('GIT_AUTHOR_EMAIL=agent@dustbucket.com')
    expect(dockerArguments).toContain('GIT_COMMITTER_NAME=Dust Agent')
    expect(dockerArguments).toContain(
      'GIT_COMMITTER_EMAIL=agent@dustbucket.com'
    )
  })

  test('allows overriding git identity via env', () => {
    const dockerArguments = buildDockerRunArguments(
      {
        imageTag: 'dust-agent-test',
        repoPath: '/home/user/project',
        homeDir: '/home/user',
      },
      ['-p', 'test'],
      { GIT_AUTHOR_NAME: 'Custom Author' }
    )

    // Should use the explicit value, not the default
    expect(dockerArguments).toContain('GIT_AUTHOR_NAME=Custom Author')
    // Other defaults should still be set
    expect(dockerArguments).toContain('GIT_AUTHOR_EMAIL=agent@dustbucket.com')
  })

  test('does not configure git URL rewriting when gitProxyUrl is not set', () => {
    const dockerArguments = buildDockerRunArguments(
      {
        imageTag: 'dust-agent-test',
        repoPath: '/home/user/project',
        homeDir: '/home/user',
      },
      ['-p', 'test'],
      {}
    )

    expect(
      dockerArguments.find(argument => argument.includes('GIT_PROXY_URL'))
    ).toBeUndefined()
    expect(
      dockerArguments.find(argument => argument.includes('GIT_CONFIG_COUNT'))
    ).toBeUndefined()
    expect(
      dockerArguments.find(argument => argument.includes('insteadOf'))
    ).toBeUndefined()
  })

  test('mounts settings file and passes --settings when settingsFilePath is set', () => {
    const claudeArgs = ['-p', 'test']
    const dockerArguments = buildDockerRunArguments(
      {
        imageTag: 'dust-agent-test',
        repoPath: '/home/user/project',
        homeDir: '/home/user',
        claudeApiProxyUrl: 'http://host.docker.internal:3002',
        settingsFilePath: '/tmp/dust-settings.json',
      },
      claudeArgs,
      {}
    )

    // Should mount the settings file read-only
    expect(dockerArguments).toContain(
      '/tmp/dust-settings.json:/home/user/.dust-settings.json:ro'
    )
    // Should pass --settings to claude command
    expect(claudeArgs).toContain('--settings')
    expect(claudeArgs).toContain('/home/user/.dust-settings.json')
  })

  test('does not set ANTHROPIC_AUTH_TOKEN when claudeApiProxyUrl is set', () => {
    const dockerArguments = buildDockerRunArguments(
      {
        imageTag: 'dust-agent-test',
        repoPath: '/home/user/project',
        homeDir: '/home/user',
        claudeApiProxyUrl: 'http://host.docker.internal:3002',
        settingsFilePath: '/tmp/dust-settings.json',
      },
      ['-p', 'test'],
      {}
    )

    // Should NOT contain ANTHROPIC_AUTH_TOKEN (no more proxy-managed dummy token)
    const authTokenArg = dockerArguments.find(arg =>
      arg.includes('ANTHROPIC_AUTH_TOKEN')
    )
    expect(authTokenArg).toBeUndefined()
  })
})

describe('generateApiKeyHelperSettings', () => {
  test('generates valid JSON with apiKeyHelper', () => {
    const settings = generateApiKeyHelperSettings(
      'http://host.docker.internal:3002'
    )
    const parsed = JSON.parse(settings)
    expect(parsed).toHaveProperty('apiKeyHelper')
  })

  test('includes curl command to fetch token', () => {
    const settings = generateApiKeyHelperSettings(
      'http://host.docker.internal:3002'
    )
    const parsed = JSON.parse(settings)
    expect(parsed.apiKeyHelper).toContain('curl')
    expect(parsed.apiKeyHelper).toContain(
      'http://host.docker.internal:3002/token'
    )
  })

  test('includes flags for silent, fast-fail, and max-time', () => {
    const settings = generateApiKeyHelperSettings(
      'http://host.docker.internal:3002'
    )
    const parsed = JSON.parse(settings)
    expect(parsed.apiKeyHelper).toContain('-fsS')
    expect(parsed.apiKeyHelper).toContain('--max-time 2')
  })

  test('strips trailing newline from curl output', () => {
    const settings = generateApiKeyHelperSettings(
      'http://host.docker.internal:3002'
    )
    const parsed = JSON.parse(settings)
    expect(parsed.apiKeyHelper).toContain("tr -d '\\n'")
  })

  test('uses provided proxy URL', () => {
    const settings = generateApiKeyHelperSettings('http://localhost:9999')
    const parsed = JSON.parse(settings)
    expect(parsed.apiKeyHelper).toContain('http://localhost:9999/token')
  })
})

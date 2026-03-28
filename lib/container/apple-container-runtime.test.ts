import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import {
  asChildProcessStub,
  asTestType,
  createSpawnEmulator,
} from '../test-support/test-utilities'
import type { ContainerDependencies } from './runtime'
import { appleContainerRuntime } from './apple-container-runtime'

describe('appleContainerRuntime', () => {
  test('has correct name', () => {
    expect(appleContainerRuntime.name).toBe('apple-container')
  })

  test('has correct runCommand', () => {
    expect(appleContainerRuntime.runCommand).toBe('container')
  })
})

describe('appleContainerRuntime.isAvailable', () => {
  test('returns true when container --version succeeds', async () => {
    const { spawn } = createSpawnEmulator({ autoResolve: true })
    const dependencies: ContainerDependencies = {
      spawn: asTestType<ContainerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await appleContainerRuntime.isAvailable(dependencies)
    expect(result).toBe(true)
  })

  test('returns false when container --version fails', async () => {
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      defaultExitCode: 1,
    })
    const dependencies: ContainerDependencies = {
      spawn: asTestType<ContainerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await appleContainerRuntime.isAvailable(dependencies)
    expect(result).toBe(false)
  })

  test('returns false when container command is not found', async () => {
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      commands: {
        container: { error: new Error('spawn ENOENT') },
      },
    })
    const dependencies: ContainerDependencies = {
      spawn: asTestType<ContainerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await appleContainerRuntime.isAvailable(dependencies)
    expect(result).toBe(false)
  })
})

describe('appleContainerRuntime.buildImage', () => {
  test('returns success when build succeeds', async () => {
    const { spawn } = createSpawnEmulator({ autoResolve: true })
    const dependencies: ContainerDependencies = {
      spawn: asTestType<ContainerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await appleContainerRuntime.buildImage(
      { repoPath: '/home/user/project', imageTag: 'dust-agent-project' },
      dependencies
    )

    expect(result.success).toBe(true)
  })

  test('returns error when build fails', async () => {
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      commands: {
        container: { exitCode: 1, stderr: 'Build error: no such file' },
      },
    })
    const dependencies: ContainerDependencies = {
      spawn: asTestType<ContainerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await appleContainerRuntime.buildImage(
      { repoPath: '/home/user/project', imageTag: 'dust-agent-project' },
      dependencies
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Build error: no such file')
      expect(result.error).toContain('exit code 1')
    }
  })

  test('returns error when spawn fails', async () => {
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      commands: {
        container: { error: new Error('spawn ENOENT') },
      },
    })
    const dependencies: ContainerDependencies = {
      spawn: asTestType<ContainerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await appleContainerRuntime.buildImage(
      { repoPath: '/home/user/project', imageTag: 'dust-agent-project' },
      dependencies
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('spawn ENOENT')
    }
  })

  test('passes correct arguments to container build', async () => {
    let capturedCommand: string | undefined
    let capturedArguments: string[] | undefined

    const dependencies: ContainerDependencies = {
      spawn: ((cmd: string, spawnArguments: string[]) => {
        capturedCommand = cmd
        capturedArguments = spawnArguments
        const proc = new EventEmitter() as EventEmitter & {
          stdout: EventEmitter | null
          stderr: EventEmitter
        }
        proc.stdout = new EventEmitter()
        proc.stderr = new EventEmitter()
        setTimeout(() => proc.emit('close', 0), 0)
        return asChildProcessStub(proc)
      }) as ContainerDependencies['spawn'],
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    await appleContainerRuntime.buildImage(
      { repoPath: '/home/user/project', imageTag: 'dust-agent-project' },
      dependencies
    )

    expect(capturedCommand).toBe('container')
    expect(capturedArguments).toContain('build')
    expect(capturedArguments).toContain('-t')
    expect(capturedArguments).toContain('dust-agent-project')
    expect(capturedArguments).toContain('-f')
    expect(capturedArguments).toContain(
      '/home/user/project/.dust/config/container/Dockerfile'
    )
    expect(capturedArguments).toContain('/home/user/project')
  })
})

describe('appleContainerRuntime.buildRunArgs', () => {
  test('builds basic run arguments', () => {
    const runArguments = appleContainerRuntime.buildRunArgs({
      imageTag: 'dust-agent-test',
      repoPath: '/home/user/project',
      homeDir: '/home/user',
    })

    expect(runArguments).toContain('run')
    expect(runArguments).toContain('--rm')
    expect(runArguments).toContain('--volume')
    expect(runArguments).toContain('/home/user/project:/workspace')
    expect(runArguments).toContain('--workdir')
    expect(runArguments).toContain('/workspace')
    expect(runArguments).toContain('dust-agent-test')
  })

  test('includes git proxy URL when provided', () => {
    const runArguments = appleContainerRuntime.buildRunArgs({
      imageTag: 'dust-agent-test',
      repoPath: '/home/user/project',
      homeDir: '/home/user',
      gitProxyUrl: 'http://host.docker.internal:9999',
    })

    expect(runArguments).toContain('--env')
    expect(runArguments).toContain(
      'GIT_PROXY_URL=http://host.docker.internal:9999'
    )
  })

  test('includes claude API proxy URL when provided', () => {
    const runArguments = appleContainerRuntime.buildRunArgs({
      imageTag: 'dust-agent-test',
      repoPath: '/home/user/project',
      homeDir: '/home/user',
      claudeApiProxyUrl: 'http://host.docker.internal:8888',
    })

    expect(runArguments).toContain('--env')
    expect(runArguments).toContain(
      'CLAUDE_API_PROXY_URL=http://host.docker.internal:8888'
    )
  })

  test('mounts settings file when provided', () => {
    const runArguments = appleContainerRuntime.buildRunArgs({
      imageTag: 'dust-agent-test',
      repoPath: '/home/user/project',
      homeDir: '/home/user',
      settingsFilePath: '/tmp/claude-settings.json',
    })

    expect(runArguments).toContain('--volume')
    expect(runArguments).toContain(
      '/tmp/claude-settings.json:/tmp/claude-settings.json:ro'
    )
  })
})

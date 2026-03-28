import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import {
  asChildProcessStub,
  asTestType,
  createSpawnEmulator,
} from '../test-support/test-utilities'
import type { ContainerDependencies } from './runtime'
import {
  dockerRuntime,
  generateImageTag,
  getDefaultDockerfilePath,
  hasDockerfile,
} from './docker-runtime'

describe('dockerRuntime', () => {
  test('has correct name', () => {
    expect(dockerRuntime.name).toBe('docker')
  })

  test('has correct runCommand', () => {
    expect(dockerRuntime.runCommand).toBe('docker')
  })
})

describe('dockerRuntime.isAvailable', () => {
  test('returns true when docker --version succeeds', async () => {
    const { spawn } = createSpawnEmulator({ autoResolve: true })
    const dependencies: ContainerDependencies = {
      spawn: asTestType<ContainerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await dockerRuntime.isAvailable(dependencies)
    expect(result).toBe(true)
  })

  test('returns false when docker --version fails', async () => {
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      defaultExitCode: 1,
    })
    const dependencies: ContainerDependencies = {
      spawn: asTestType<ContainerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await dockerRuntime.isAvailable(dependencies)
    expect(result).toBe(false)
  })

  test('returns false when docker command is not found', async () => {
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      commands: {
        docker: { error: new Error('spawn ENOENT') },
      },
    })
    const dependencies: ContainerDependencies = {
      spawn: asTestType<ContainerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await dockerRuntime.isAvailable(dependencies)
    expect(result).toBe(false)
  })
})

describe('dockerRuntime.buildImage', () => {
  test('returns success when build succeeds', async () => {
    const { spawn } = createSpawnEmulator({ autoResolve: true })
    const dependencies: ContainerDependencies = {
      spawn: asTestType<ContainerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await dockerRuntime.buildImage(
      { repoPath: '/home/user/project', imageTag: 'dust-agent-project' },
      dependencies
    )

    expect(result.success).toBe(true)
  })

  test('returns error when build fails', async () => {
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      commands: {
        docker: { exitCode: 1, stderr: 'Build error: no such file' },
      },
    })
    const dependencies: ContainerDependencies = {
      spawn: asTestType<ContainerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await dockerRuntime.buildImage(
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
        docker: { error: new Error('spawn ENOENT') },
      },
    })
    const dependencies: ContainerDependencies = {
      spawn: asTestType<ContainerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await dockerRuntime.buildImage(
      { repoPath: '/home/user/project', imageTag: 'dust-agent-project' },
      dependencies
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('spawn ENOENT')
    }
  })

  test('passes correct arguments to docker build', async () => {
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

    await dockerRuntime.buildImage(
      { repoPath: '/home/user/project', imageTag: 'dust-agent-project' },
      dependencies
    )

    expect(capturedCommand).toBe('docker')
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

describe('dockerRuntime.buildRunArgs', () => {
  test('builds basic run arguments', () => {
    const runArguments = dockerRuntime.buildRunArgs({
      imageTag: 'dust-agent-test',
      repoPath: '/home/user/project',
      homeDir: '/home/user',
    })

    expect(runArguments).toContain('run')
    expect(runArguments).toContain('--rm')
    expect(runArguments).toContain('-v')
    expect(runArguments).toContain('/home/user/project:/workspace')
    expect(runArguments).toContain('-w')
    expect(runArguments).toContain('/workspace')
    expect(runArguments).toContain('dust-agent-test')
  })

  test('includes git proxy URL when provided', () => {
    const runArguments = dockerRuntime.buildRunArgs({
      imageTag: 'dust-agent-test',
      repoPath: '/home/user/project',
      homeDir: '/home/user',
      gitProxyUrl: 'http://host.docker.internal:9999',
    })

    expect(runArguments).toContain('-e')
    expect(runArguments).toContain(
      'GIT_PROXY_URL=http://host.docker.internal:9999'
    )
  })

  test('includes claude API proxy URL when provided', () => {
    const runArguments = dockerRuntime.buildRunArgs({
      imageTag: 'dust-agent-test',
      repoPath: '/home/user/project',
      homeDir: '/home/user',
      claudeApiProxyUrl: 'http://host.docker.internal:8888',
    })

    expect(runArguments).toContain('-e')
    expect(runArguments).toContain(
      'CLAUDE_API_PROXY_URL=http://host.docker.internal:8888'
    )
  })

  test('mounts settings file when provided', () => {
    const runArguments = dockerRuntime.buildRunArgs({
      imageTag: 'dust-agent-test',
      repoPath: '/home/user/project',
      homeDir: '/home/user',
      settingsFilePath: '/tmp/claude-settings.json',
    })

    expect(runArguments).toContain('-v')
    expect(runArguments).toContain(
      '/tmp/claude-settings.json:/tmp/claude-settings.json:ro'
    )
  })
})

describe('generateImageTag', () => {
  test('generates tag from simple repo name', () => {
    expect(generateImageTag('/home/user/my-project')).toBe(
      'dust-agent-my-project'
    )
  })

  test('converts to lowercase', () => {
    expect(generateImageTag('/home/user/MyProject')).toBe(
      'dust-agent-myproject'
    )
  })

  test('replaces invalid characters with hyphens', () => {
    expect(generateImageTag('/home/user/my project@v1')).toBe(
      'dust-agent-my-project-v1'
    )
  })

  test('handles special characters', () => {
    expect(generateImageTag('/home/user/project_name.v2')).toBe(
      'dust-agent-project_name.v2'
    )
  })
})

describe('hasDockerfile', () => {
  test('returns true when .dust/config/container/Dockerfile exists', () => {
    const { spawn } = createSpawnEmulator({ autoResolve: true })
    const dependencies: ContainerDependencies = {
      spawn: asTestType<ContainerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: (p: string) =>
        p === '/home/user/project/.dust/config/container/Dockerfile',
    }

    expect(hasDockerfile('/home/user/project', dependencies)).toBe(true)
  })

  test('returns false when .dust/config/container/Dockerfile does not exist', () => {
    const { spawn } = createSpawnEmulator({ autoResolve: true })
    const dependencies: ContainerDependencies = {
      spawn: asTestType<ContainerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => false,
    }

    expect(hasDockerfile('/home/user/project', dependencies)).toBe(false)
  })
})

describe('getDefaultDockerfilePath', () => {
  test('returns path ending with default.Dockerfile', () => {
    const path = getDefaultDockerfilePath()
    expect(path).toMatch(/default\.Dockerfile$/)
  })
})

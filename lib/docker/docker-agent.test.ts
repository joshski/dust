import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import {
  asChildProcessStub,
  asTestType,
  createSpawnEmulator,
} from '../test-support/test-utilities'
import {
  buildDockerImage,
  type DockerDependencies,
  generateImageTag,
  getDefaultDockerfilePath,
  hasDockerfile,
  isDockerAvailable,
  prepareDockerConfig,
  prepareContainerConfigWithRuntime,
} from './docker-agent'
import { appleContainerRuntime } from '../container/apple-container-runtime'

describe('isDockerAvailable', () => {
  test('returns true when docker --version succeeds', async () => {
    const { spawn } = createSpawnEmulator({ autoResolve: true })
    const dependencies: DockerDependencies = {
      spawn: asTestType<DockerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await isDockerAvailable(dependencies)
    expect(result).toBe(true)
  })

  test('returns false when docker --version fails', async () => {
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      defaultExitCode: 1,
    })
    const dependencies: DockerDependencies = {
      spawn: asTestType<DockerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await isDockerAvailable(dependencies)
    expect(result).toBe(false)
  })

  test('returns false when docker command is not found', async () => {
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      commands: {
        docker: { error: new Error('spawn ENOENT') },
      },
    })
    const dependencies: DockerDependencies = {
      spawn: asTestType<DockerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await isDockerAvailable(dependencies)
    expect(result).toBe(false)
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

describe('buildDockerImage', () => {
  test('returns success when build succeeds', async () => {
    const { spawn } = createSpawnEmulator({ autoResolve: true })
    const dependencies: DockerDependencies = {
      spawn: asTestType<DockerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await buildDockerImage(
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
    const dependencies: DockerDependencies = {
      spawn: asTestType<DockerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await buildDockerImage(
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
    const dependencies: DockerDependencies = {
      spawn: asTestType<DockerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    const result = await buildDockerImage(
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

    const dependencies: DockerDependencies = {
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
      }) as DockerDependencies['spawn'],
      homedir: () => '/home/user',
      existsSync: () => true,
    }

    await buildDockerImage(
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

describe('hasDockerfile', () => {
  test('returns true when .dust/config/container/Dockerfile exists', () => {
    const { spawn } = createSpawnEmulator({ autoResolve: true })
    const dependencies: DockerDependencies = {
      spawn: asTestType<DockerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: (p: string) =>
        p === '/home/user/project/.dust/config/container/Dockerfile',
    }

    expect(hasDockerfile('/home/user/project', dependencies)).toBe(true)
  })

  test('returns false when .dust/config/container/Dockerfile does not exist', () => {
    const { spawn } = createSpawnEmulator({ autoResolve: true })
    const dependencies: DockerDependencies = {
      spawn: asTestType<DockerDependencies['spawn']>(spawn),
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

describe('prepareDockerConfig', () => {
  test('returns empty object when no Dockerfile and forceDocker is false', async () => {
    const events: { type: string }[] = []
    const { spawn } = createSpawnEmulator({ autoResolve: true })
    const dependencies: DockerDependencies = {
      spawn: asTestType<DockerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => false,
    }

    const result = await prepareDockerConfig(
      '/home/user/project',
      dependencies,
      event => events.push(event)
    )

    expect(result).toEqual({})
    expect(events).toHaveLength(0)
  })

  test('uses default Dockerfile when forceDocker is true and no custom Dockerfile', async () => {
    let capturedDockerfilePath: string | undefined
    const events: { type: string; imageTag?: string }[] = []
    const dependencies: DockerDependencies = {
      spawn: ((cmd: string, spawnArgs: string[]) => {
        if (cmd === 'docker' && spawnArgs[0] === 'build') {
          const fIndex = spawnArgs.indexOf('-f')
          if (fIndex !== -1) {
            capturedDockerfilePath = spawnArgs[fIndex + 1]
          }
        }
        const proc = new EventEmitter() as EventEmitter & {
          stdout: EventEmitter | null
          stderr: EventEmitter
        }
        proc.stdout = new EventEmitter()
        proc.stderr = new EventEmitter()
        setTimeout(() => proc.emit('close', 0), 0)
        return asChildProcessStub(proc)
      }) as DockerDependencies['spawn'],
      homedir: () => '/home/user',
      existsSync: () => false,
    }

    const result = await prepareDockerConfig(
      '/home/user/project',
      dependencies,
      event => events.push(event),
      { forceDocker: true }
    )

    expect(result).toHaveProperty('config')
    expect(capturedDockerfilePath).toMatch(/default\.Dockerfile$/)
    expect(events).toContainEqual({
      type: 'loop.docker_detected',
      imageTag: 'dust-agent-project',
    })
    expect(events).toContainEqual({
      type: 'loop.docker_built',
      imageTag: 'dust-agent-project',
    })
  })

  test('uses custom Dockerfile when it exists even with forceDocker true', async () => {
    let capturedDockerfilePath: string | undefined
    const events: { type: string; imageTag?: string }[] = []
    const dependencies: DockerDependencies = {
      spawn: ((cmd: string, spawnArgs: string[]) => {
        if (cmd === 'docker' && spawnArgs[0] === 'build') {
          const fIndex = spawnArgs.indexOf('-f')
          if (fIndex !== -1) {
            capturedDockerfilePath = spawnArgs[fIndex + 1]
          }
        }
        const proc = new EventEmitter() as EventEmitter & {
          stdout: EventEmitter | null
          stderr: EventEmitter
        }
        proc.stdout = new EventEmitter()
        proc.stderr = new EventEmitter()
        setTimeout(() => proc.emit('close', 0), 0)
        return asChildProcessStub(proc)
      }) as DockerDependencies['spawn'],
      homedir: () => '/home/user',
      existsSync: (p: string) =>
        p === '/home/user/project/.dust/config/container/Dockerfile',
    }

    const result = await prepareDockerConfig(
      '/home/user/project',
      dependencies,
      event => events.push(event),
      { forceDocker: true }
    )

    expect(result).toHaveProperty('config')
    // Should use the custom Dockerfile path, not the bundled default
    expect(capturedDockerfilePath).toBe(
      '/home/user/project/.dust/config/container/Dockerfile'
    )
  })

  test('returns error when Docker not available with forceDocker', async () => {
    const events: { type: string; imageTag?: string }[] = []
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      defaultExitCode: 1,
    })
    const dependencies: DockerDependencies = {
      spawn: asTestType<DockerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => false,
    }

    const result = await prepareDockerConfig(
      '/home/user/project',
      dependencies,
      event => events.push(event),
      { forceDocker: true }
    )

    expect(result).toEqual({
      error: 'Docker not available. Install Docker to use --docker flag.',
    })
  })

  test('returns Apple Container error when runtime not available with forceContainer', async () => {
    const events: { type: string; imageTag?: string }[] = []
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      defaultExitCode: 1,
    })
    const dependencies: DockerDependencies = {
      spawn: asTestType<DockerDependencies['spawn']>(spawn),
      homedir: () => '/home/user',
      existsSync: () => false,
    }

    const result = await prepareContainerConfigWithRuntime(
      '/home/user/project',
      dependencies,
      event => events.push(event),
      appleContainerRuntime,
      { forceContainer: true }
    )

    expect(result).toEqual({
      error:
        'Apple Container CLI not found. Install from https://github.com/apple/container or use --docker.',
    })
  })
})

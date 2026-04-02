import { afterEach, describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createErrnoError,
  createFileSystemEmulator,
  createTestRuntimeConfig,
  restoreEnv,
  stripAnsi,
  stubEnv,
} from '../../test-support/test-utilities'
import type { CommandDependencies } from '../types'
import { init } from './init'

describe('init command', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('creates .dust directory structure', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    const result = await init(dependencies)

    expect(result.exitCode).toBe(0)
    expect(fileSystem.createdDirs).toEqual([
      '/project/.dust',
      '/project/.dust/facts',
      '/project/.dust/ideas',
      '/project/.dust/principles',
      '/project/.dust/tasks',
      '/project/.dust/config',
    ])
  })

  test('creates initial fact file', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    expect(
      fileSystem.writtenFiles.has(
        '/project/.dust/facts/use-dust-for-planning.md'
      )
    ).toBe(true)
    const content = fileSystem.writtenFiles.get(
      '/project/.dust/facts/use-dust-for-planning.md'
    )
    expect(content).toContain('# Use dust for planning')
    expect(content).toContain('https://github.com/joshski/dust')
  })

  test('outputs success messages', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    const output = stripAnsi(context.stdoutLines.join('\n'))
    expect(output).toContain('Initialized Dust repository')
    expect(output).toContain('Created directories')
  })

  test('shows notification when .dust already exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          facts: { 'use-dust-for-planning.md': '# Existing fact' },
          config: { 'settings.json': '{}' },
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

    const result = await init(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('already exists, skipping')
  })

  test('creates CLAUDE.md with agent instructions', async () => {
    stubEnv('BUN_INSTALL', '')
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    expect(fileSystem.writtenFiles.has('/project/CLAUDE.md')).toBe(true)
    const content = fileSystem.writtenFiles.get('/project/CLAUDE.md')
    expect(content).toContain('npx dust agent')
    expect(stripAnsi(context.stdoutLines.join('\n'))).toContain(
      'Created CLAUDE.md'
    )
  })

  test('creates AGENTS.md with agent instructions', async () => {
    stubEnv('BUN_INSTALL', '')
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    expect(fileSystem.writtenFiles.has('/project/AGENTS.md')).toBe(true)
    const content = fileSystem.writtenFiles.get('/project/AGENTS.md')
    expect(content).toContain('npx dust agent')
    expect(stripAnsi(context.stdoutLines.join('\n'))).toContain(
      'Created AGENTS.md'
    )
  })

  test('warns when CLAUDE.md already exists', async () => {
    stubEnv('BUN_INSTALL', '')
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { 'CLAUDE.md': '' },
    })
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    expect(fileSystem.writtenFiles.has('/project/CLAUDE.md')).toBe(false)
    const output = stripAnsi(context.stdoutLines.join('\n'))
    expect(output).toContain('Warning: CLAUDE.md already exists')
    expect(output).toContain('npx dust agent')
  })

  test('warns when AGENTS.md already exists', async () => {
    stubEnv('BUN_INSTALL', '')
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { 'AGENTS.md': '' },
    })
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    expect(fileSystem.writtenFiles.has('/project/AGENTS.md')).toBe(false)
    const output = stripAnsi(context.stdoutLines.join('\n'))
    expect(output).toContain('Warning: AGENTS.md already exists')
    expect(output).toContain('npx dust agent')
  })

  test('uses bunx when bun.lockb exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { 'bun.lockb': '' },
    })
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    const claudeContent = fileSystem.writtenFiles.get('/project/CLAUDE.md')
    expect(claudeContent).toContain('bunx dust agent')
    const agentsContent = fileSystem.writtenFiles.get('/project/AGENTS.md')
    expect(agentsContent).toContain('bunx dust agent')
  })

  test('creates settings.json with npm test for Node.js projects', async () => {
    stubEnv('BUN_INSTALL', '')
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { 'package.json': '' },
    })
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    expect(
      fileSystem.writtenFiles.has('/project/.dust/config/settings.json')
    ).toBe(true)
    const content = fileSystem.writtenFiles.get(
      '/project/.dust/config/settings.json'
    )
    const settings = JSON.parse(content ?? '')
    expect(settings.dustCommand).toBe('npx dust')
    expect(settings.checks).toEqual([{ name: 'test', command: 'npm test' }])
  })

  test('creates settings.json with bun test for Bun projects', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { 'bun.lockb': '' },
    })
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    const content = fileSystem.writtenFiles.get(
      '/project/.dust/config/settings.json'
    )
    const settings = JSON.parse(content ?? '')
    expect(settings.dustCommand).toBe('bunx dust')
    expect(settings.checks).toEqual([{ name: 'test', command: 'bun test' }])
  })

  test('creates settings.json with pnpm test for pnpm projects', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { 'pnpm-lock.yaml': '' },
    })
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    const content = fileSystem.writtenFiles.get(
      '/project/.dust/config/settings.json'
    )
    const settings = JSON.parse(content ?? '')
    expect(settings.dustCommand).toBe('pnpx dust')
    expect(settings.checks).toEqual([{ name: 'test', command: 'pnpm test' }])
  })

  test('creates settings.json with empty checks for non-Node projects', async () => {
    stubEnv('BUN_INSTALL', '')
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    const content = fileSystem.writtenFiles.get(
      '/project/.dust/config/settings.json'
    )
    const settings = JSON.parse(content ?? '')
    expect(settings.dustCommand).toBe('npx dust')
    expect(settings.checks).toEqual([])
  })

  test('outputs settings creation message', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    expect(stripAnsi(context.stdoutLines.join('\n'))).toContain(
      'Created settings: .dust/config/settings.json'
    )
  })

  test('uses pnpx when pnpm-lock.yaml exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { 'pnpm-lock.yaml': '' },
    })
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    const claudeContent = fileSystem.writtenFiles.get('/project/CLAUDE.md')
    expect(claudeContent).toContain('pnpx dust agent')
    const agentsContent = fileSystem.writtenFiles.get('/project/AGENTS.md')
    expect(agentsContent).toContain('pnpx dust agent')
  })

  test('uses npx when package-lock.json exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { 'package-lock.json': '' },
    })
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    const claudeContent = fileSystem.writtenFiles.get('/project/CLAUDE.md')
    expect(claudeContent).toContain('npx dust agent')
    const agentsContent = fileSystem.writtenFiles.get('/project/AGENTS.md')
    expect(agentsContent).toContain('npx dust agent')
  })

  test('uses bunx when BUN_INSTALL env var is set and no lockfiles', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig({ bunInstall: '/home/user/.bun' }),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    const claudeContent = fileSystem.writtenFiles.get('/project/CLAUDE.md')
    expect(claudeContent).toContain('bunx dust agent')
    const agentsContent = fileSystem.writtenFiles.get('/project/AGENTS.md')
    expect(agentsContent).toContain('bunx dust agent')
  })

  test('outputs suggestions for next steps', async () => {
    stubEnv('BUN_INSTALL', '')
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('Commit the changes if you are happy')
    expect(output).toContain('get planning!')
  })

  test('suggestions include examples for new repositories', async () => {
    stubEnv('BUN_INSTALL', '')
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('If this is a new repository')
    expect(output).toContain('Idea:')
    expect(output).toContain('Task:')
  })

  test('suggestions include examples for existing codebases', async () => {
    stubEnv('BUN_INSTALL', '')
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('If this is an existing codebase')
    expect(output).toContain('principles and facts')
  })

  test('suggestions use npx runner when package-lock.json exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { 'package-lock.json': '' },
    })
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    const output = stripAnsi(context.stdoutLines.join('\n'))
    expect(output).toContain('> npx claude')
    expect(output).toContain('> npx codex')
  })

  test('suggestions use bunx runner when bun.lockb exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { 'bun.lockb': '' },
    })
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    const output = stripAnsi(context.stdoutLines.join('\n'))
    expect(output).toContain('> bunx claude')
    expect(output).toContain('> bunx codex')
  })

  test('suggestions use pnpx runner when pnpm-lock.yaml exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { 'pnpm-lock.yaml': '' },
    })
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    const output = stripAnsi(context.stdoutLines.join('\n'))
    expect(output).toContain('> pnpx claude')
    expect(output).toContain('> pnpx codex')
  })

  test('rethrows non-EEXIST errors when writing fact file', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    fileSystem.writeFile = async () => {
      throw createErrnoError('EACCES', 'EACCES: permission denied')
    }
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await expect(init(dependencies)).rejects.toThrow('EACCES')
  })

  test('rethrows non-EEXIST errors when writing settings.json', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    let callCount = 0
    const originalWriteFile = fileSystem.writeFile.bind(fileSystem)
    fileSystem.writeFile = async (path, content, options) => {
      callCount++
      // Let the first write (fact file) succeed
      if (callCount === 1) {
        return originalWriteFile(path, content, options)
      }
      // Second write (settings.json) throws a permission error
      throw createErrnoError('EACCES', 'EACCES: permission denied')
    }
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await expect(init(dependencies)).rejects.toThrow('EACCES')
  })

  test('rethrows non-EEXIST errors when writing CLAUDE.md', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    let callCount = 0
    const originalWriteFile = fileSystem.writeFile.bind(fileSystem)
    fileSystem.writeFile = async (path, content, options) => {
      callCount++
      // Let the first two writes (fact file and settings.json) succeed
      if (callCount <= 2) {
        return originalWriteFile(path, content, options)
      }
      // Third write (CLAUDE.md) throws a permission error
      throw createErrnoError('EACCES', 'EACCES: permission denied')
    }
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await expect(init(dependencies)).rejects.toThrow('EACCES')
  })

  test('rethrows non-EEXIST errors when writing AGENTS.md', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    let callCount = 0
    const originalWriteFile = fileSystem.writeFile.bind(fileSystem)
    fileSystem.writeFile = async (path, content, options) => {
      callCount++
      // Let the first three writes succeed
      if (callCount <= 3) {
        return originalWriteFile(path, content, options)
      }
      // Fourth write (AGENTS.md) throws a permission error
      throw createErrnoError('EACCES', 'EACCES: permission denied')
    }
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await expect(init(dependencies)).rejects.toThrow('EACCES')
  })
})

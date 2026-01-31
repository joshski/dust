import { afterEach, describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  restoreEnv,
  stripAnsi,
  stubEnv,
} from '../../test/test-utilities'
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
      settings: { dustCommand: 'dust' },
    }

    const result = await init(dependencies)

    expect(result.exitCode).toBe(0)
    expect(fileSystem.createdDirs).toEqual([
      '/project/.dust',
      '/project/.dust/goals',
      '/project/.dust/ideas',
      '/project/.dust/tasks',
      '/project/.dust/facts',
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
      project: { '.dust': {} },
    })
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
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
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    expect(fileSystem.writtenFiles.has('/project/CLAUDE.md')).toBe(true)
    const content = fileSystem.writtenFiles.get('/project/CLAUDE.md')
    expect(content).toContain('npx dust agent')
    expect(stripAnsi(context.stdoutLines.join('\n'))).toContain('Created CLAUDE.md')
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
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    expect(fileSystem.writtenFiles.has('/project/AGENTS.md')).toBe(true)
    const content = fileSystem.writtenFiles.get('/project/AGENTS.md')
    expect(content).toContain('npx dust agent')
    expect(stripAnsi(context.stdoutLines.join('\n'))).toContain('Created AGENTS.md')
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
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    const claudeContent = fileSystem.writtenFiles.get('/project/CLAUDE.md')
    expect(claudeContent).toContain('npx dust agent')
    const agentsContent = fileSystem.writtenFiles.get('/project/AGENTS.md')
    expect(agentsContent).toContain('npx dust agent')
  })

  test('uses bunx when BUN_INSTALL env var is set and no lockfiles', async () => {
    stubEnv('BUN_INSTALL', '/home/user/.bun')

    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    const dependencies: CommandDependencies = {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
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
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('If this is an existing codebase')
    expect(output).toContain('goals and facts')
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
      settings: { dustCommand: 'dust' },
    }

    await init(dependencies)

    const output = stripAnsi(context.stdoutLines.join('\n'))
    expect(output).toContain('> pnpx claude')
    expect(output).toContain('> pnpx codex')
  })
})

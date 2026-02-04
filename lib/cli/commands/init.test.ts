import { afterEach, describe, expect, test } from 'vitest'
import {
  createCommandDependencies,
  restoreEnv,
  stripAnsi,
  stubEnv,
} from '../../test/test-utilities'
import { init } from './init'

function output(context: { stdoutLines: string[] }) {
  return stripAnsi(context.stdoutLines.join('\n'))
}

function writtenSettings(fileSystem: { writtenFiles: Map<string, string> }) {
  return JSON.parse(
    fileSystem.writtenFiles.get('/project/.dust/config/settings.json') ?? '{}'
  )
}

describe('init command', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('creates .dust directory structure', async () => {
    const { fileSystem, dependencies } = createCommandDependencies()

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
    const { fileSystem, dependencies } = createCommandDependencies()

    await init(dependencies)

    const content = fileSystem.writtenFiles.get(
      '/project/.dust/facts/use-dust-for-planning.md'
    )
    expect(content).toContain('# Use dust for planning')
    expect(content).toContain('https://github.com/joshski/dust')
  })

  test('outputs success messages', async () => {
    const { context, dependencies } = createCommandDependencies()

    await init(dependencies)

    expect(output(context)).toContain('Initialized Dust repository')
    expect(output(context)).toContain('Created directories')
  })

  test('shows notification when .dust already exists', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            facts: { 'use-dust-for-planning.md': '# Existing fact' },
            config: { 'settings.json': '{}' },
          },
        },
      },
    })

    const result = await init(dependencies)

    expect(result.exitCode).toBe(0)
    expect(output(context)).toContain('already exists, skipping')
  })

  test('creates CLAUDE.md with agent instructions', async () => {
    stubEnv('BUN_INSTALL', '')
    const { context, fileSystem, dependencies } = createCommandDependencies()

    await init(dependencies)

    expect(fileSystem.writtenFiles.get('/project/CLAUDE.md')).toContain(
      'npx dust agent'
    )
    expect(output(context)).toContain('Created CLAUDE.md')
  })

  test('creates AGENTS.md with agent instructions', async () => {
    stubEnv('BUN_INSTALL', '')
    const { context, fileSystem, dependencies } = createCommandDependencies()

    await init(dependencies)

    expect(fileSystem.writtenFiles.get('/project/AGENTS.md')).toContain(
      'npx dust agent'
    )
    expect(output(context)).toContain('Created AGENTS.md')
  })

  test('warns when CLAUDE.md already exists', async () => {
    stubEnv('BUN_INSTALL', '')
    const { context, fileSystem, dependencies } = createCommandDependencies({
      files: { project: { 'CLAUDE.md': '' } },
    })

    await init(dependencies)

    expect(fileSystem.writtenFiles.has('/project/CLAUDE.md')).toBe(false)
    expect(output(context)).toContain('Warning: CLAUDE.md already exists')
    expect(output(context)).toContain('npx dust agent')
  })

  test('warns when AGENTS.md already exists', async () => {
    stubEnv('BUN_INSTALL', '')
    const { context, fileSystem, dependencies } = createCommandDependencies({
      files: { project: { 'AGENTS.md': '' } },
    })

    await init(dependencies)

    expect(fileSystem.writtenFiles.has('/project/AGENTS.md')).toBe(false)
    expect(output(context)).toContain('Warning: AGENTS.md already exists')
    expect(output(context)).toContain('npx dust agent')
  })

  test('uses bunx when bun.lockb exists', async () => {
    const { fileSystem, dependencies } = createCommandDependencies({
      files: { project: { 'bun.lockb': '' } },
    })

    await init(dependencies)

    expect(fileSystem.writtenFiles.get('/project/CLAUDE.md')).toContain(
      'bunx dust agent'
    )
    expect(fileSystem.writtenFiles.get('/project/AGENTS.md')).toContain(
      'bunx dust agent'
    )
  })

  test('creates settings.json with npm test for Node.js projects', async () => {
    stubEnv('BUN_INSTALL', '')
    const { fileSystem, dependencies } = createCommandDependencies({
      files: { project: { 'package.json': '' } },
    })

    await init(dependencies)

    expect(writtenSettings(fileSystem).dustCommand).toBe('npx dust')
    expect(writtenSettings(fileSystem).checks).toEqual([
      { name: 'test', command: 'npm test' },
    ])
  })

  test('creates settings.json with bun test for Bun projects', async () => {
    const { fileSystem, dependencies } = createCommandDependencies({
      files: { project: { 'bun.lockb': '' } },
    })

    await init(dependencies)

    expect(writtenSettings(fileSystem).dustCommand).toBe('bunx dust')
    expect(writtenSettings(fileSystem).checks).toEqual([
      { name: 'test', command: 'bun test' },
    ])
  })

  test('creates settings.json with pnpm test for pnpm projects', async () => {
    const { fileSystem, dependencies } = createCommandDependencies({
      files: { project: { 'pnpm-lock.yaml': '' } },
    })

    await init(dependencies)

    expect(writtenSettings(fileSystem).dustCommand).toBe('pnpx dust')
    expect(writtenSettings(fileSystem).checks).toEqual([
      { name: 'test', command: 'pnpm test' },
    ])
  })

  test('creates settings.json with empty checks for non-Node projects', async () => {
    stubEnv('BUN_INSTALL', '')
    const { fileSystem, dependencies } = createCommandDependencies()

    await init(dependencies)

    expect(writtenSettings(fileSystem).dustCommand).toBe('npx dust')
    expect(writtenSettings(fileSystem).checks).toEqual([])
  })

  test('outputs settings creation message', async () => {
    const { context, dependencies } = createCommandDependencies()

    await init(dependencies)

    expect(output(context)).toContain(
      'Created settings: .dust/config/settings.json'
    )
  })

  test('uses pnpx when pnpm-lock.yaml exists', async () => {
    const { fileSystem, dependencies } = createCommandDependencies({
      files: { project: { 'pnpm-lock.yaml': '' } },
    })

    await init(dependencies)

    expect(fileSystem.writtenFiles.get('/project/CLAUDE.md')).toContain(
      'pnpx dust agent'
    )
    expect(fileSystem.writtenFiles.get('/project/AGENTS.md')).toContain(
      'pnpx dust agent'
    )
  })

  test('uses npx when package-lock.json exists', async () => {
    const { fileSystem, dependencies } = createCommandDependencies({
      files: { project: { 'package-lock.json': '' } },
    })

    await init(dependencies)

    expect(fileSystem.writtenFiles.get('/project/CLAUDE.md')).toContain(
      'npx dust agent'
    )
    expect(fileSystem.writtenFiles.get('/project/AGENTS.md')).toContain(
      'npx dust agent'
    )
  })

  test('uses bunx when BUN_INSTALL env var is set and no lockfiles', async () => {
    stubEnv('BUN_INSTALL', '/home/user/.bun')
    const { fileSystem, dependencies } = createCommandDependencies()

    await init(dependencies)

    expect(fileSystem.writtenFiles.get('/project/CLAUDE.md')).toContain(
      'bunx dust agent'
    )
    expect(fileSystem.writtenFiles.get('/project/AGENTS.md')).toContain(
      'bunx dust agent'
    )
  })

  test('outputs suggestions for next steps', async () => {
    stubEnv('BUN_INSTALL', '')
    const { context, dependencies } = createCommandDependencies()

    await init(dependencies)

    expect(output(context)).toContain('Commit the changes if you are happy')
    expect(output(context)).toContain('get planning!')
  })

  test('suggestions include examples for new repositories', async () => {
    stubEnv('BUN_INSTALL', '')
    const { context, dependencies } = createCommandDependencies()

    await init(dependencies)

    expect(output(context)).toContain('If this is a new repository')
    expect(output(context)).toContain('Idea:')
    expect(output(context)).toContain('Task:')
  })

  test('suggestions include examples for existing codebases', async () => {
    stubEnv('BUN_INSTALL', '')
    const { context, dependencies } = createCommandDependencies()

    await init(dependencies)

    expect(output(context)).toContain('If this is an existing codebase')
    expect(output(context)).toContain('goals and facts')
  })

  test('suggestions use npx runner when package-lock.json exists', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: { project: { 'package-lock.json': '' } },
    })

    await init(dependencies)

    expect(output(context)).toContain('> npx claude')
    expect(output(context)).toContain('> npx codex')
  })

  test('suggestions use bunx runner when bun.lockb exists', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: { project: { 'bun.lockb': '' } },
    })

    await init(dependencies)

    expect(output(context)).toContain('> bunx claude')
    expect(output(context)).toContain('> bunx codex')
  })

  test('suggestions use pnpx runner when pnpm-lock.yaml exists', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: { project: { 'pnpm-lock.yaml': '' } },
    })

    await init(dependencies)

    expect(output(context)).toContain('> pnpx claude')
    expect(output(context)).toContain('> pnpx codex')
  })

  test('rethrows non-EEXIST errors when writing fact file', async () => {
    const { fileSystem, dependencies } = createCommandDependencies()
    fileSystem.writeFile = async () => {
      const error = new Error('EACCES: permission denied')
      ;(error as NodeJS.ErrnoException).code = 'EACCES'
      throw error
    }

    await expect(init(dependencies)).rejects.toThrow('EACCES')
  })

  test('rethrows non-EEXIST errors when writing settings.json', async () => {
    const { fileSystem, dependencies } = createCommandDependencies()
    let callCount = 0
    const originalWriteFile = fileSystem.writeFile.bind(fileSystem)
    fileSystem.writeFile = async (path, content, options) => {
      callCount++
      if (callCount === 1) {
        return originalWriteFile(path, content, options)
      }
      const error = new Error('EACCES: permission denied')
      ;(error as NodeJS.ErrnoException).code = 'EACCES'
      throw error
    }

    await expect(init(dependencies)).rejects.toThrow('EACCES')
  })

  test('rethrows non-EEXIST errors when writing CLAUDE.md', async () => {
    const { fileSystem, dependencies } = createCommandDependencies()
    let callCount = 0
    const originalWriteFile = fileSystem.writeFile.bind(fileSystem)
    fileSystem.writeFile = async (path, content, options) => {
      callCount++
      if (callCount <= 2) {
        return originalWriteFile(path, content, options)
      }
      const error = new Error('EACCES: permission denied')
      ;(error as NodeJS.ErrnoException).code = 'EACCES'
      throw error
    }

    await expect(init(dependencies)).rejects.toThrow('EACCES')
  })

  test('rethrows non-EEXIST errors when writing AGENTS.md', async () => {
    const { fileSystem, dependencies } = createCommandDependencies()
    let callCount = 0
    const originalWriteFile = fileSystem.writeFile.bind(fileSystem)
    fileSystem.writeFile = async (path, content, options) => {
      callCount++
      if (callCount <= 3) {
        return originalWriteFile(path, content, options)
      }
      const error = new Error('EACCES: permission denied')
      ;(error as NodeJS.ErrnoException).code = 'EACCES'
      throw error
    }

    await expect(init(dependencies)).rejects.toThrow('EACCES')
  })
})

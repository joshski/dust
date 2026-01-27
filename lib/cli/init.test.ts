import { afterEach, describe, expect, test, vi } from 'vitest'
import { init } from './init'
import type { CommandContext, FileSystem } from './types'

function createMockContext(): CommandContext & {
  stdoutLines: string[]
  stderrLines: string[]
} {
  const stdoutLines: string[] = []
  const stderrLines: string[] = []
  return {
    cwd: '/project',
    stdout: (msg: string) => stdoutLines.push(msg),
    stderr: (msg: string) => stderrLines.push(msg),
    stdoutLines,
    stderrLines,
  }
}

function createMockFs(
  existingPaths: Set<string> = new Set()
): FileSystem & { createdDirs: string[]; writtenFiles: Map<string, string> } {
  const createdDirs: string[] = []
  const writtenFiles = new Map<string, string>()

  return {
    exists: (path: string) => existingPaths.has(path),
    readFile: async () => '',
    writeFile: async (path: string, content: string) => {
      writtenFiles.set(path, content)
    },
    mkdir: async (path: string) => {
      createdDirs.push(path)
    },
    readdir: async () => [],
    createdDirs,
    writtenFiles,
  }
}

describe('init command', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('creates .dust directory structure', async () => {
    const ctx = createMockContext()
    const fs = createMockFs()

    const result = await init(ctx, fs, [])

    expect(result.exitCode).toBe(0)
    expect(fs.createdDirs).toContain('/project/.dust')
    expect(fs.createdDirs).toContain('/project/.dust/goals')
    expect(fs.createdDirs).toContain('/project/.dust/ideas')
    expect(fs.createdDirs).toContain('/project/.dust/tasks')
    expect(fs.createdDirs).toContain('/project/.dust/facts')
    expect(fs.createdDirs).toContain('/project/.dust/config')
  })

  test('creates initial fact file', async () => {
    const ctx = createMockContext()
    const fs = createMockFs()

    await init(ctx, fs, [])

    expect(
      fs.writtenFiles.has('/project/.dust/facts/use-dust-for-planning.md')
    ).toBe(true)
    const content = fs.writtenFiles.get(
      '/project/.dust/facts/use-dust-for-planning.md'
    )
    expect(content).toContain('# Use dust for planning')
    expect(content).toContain('https://github.com/joshski/dust')
  })

  test('outputs success messages', async () => {
    const ctx = createMockContext()
    const fs = createMockFs()

    await init(ctx, fs, [])

    expect(ctx.stdoutLines.join('\n')).toContain('Initialized Dust repository')
    expect(ctx.stdoutLines.join('\n')).toContain('Created directories')
  })

  test('shows notification when .dust already exists', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/.dust']))

    const result = await init(ctx, fs, [])

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('already exists, skipping')
  })

  test('creates CLAUDE.md with agent instructions', async () => {
    vi.stubEnv('BUN_INSTALL', '')
    const ctx = createMockContext()
    const fs = createMockFs()

    await init(ctx, fs, [])

    expect(fs.writtenFiles.has('/project/CLAUDE.md')).toBe(true)
    const content = fs.writtenFiles.get('/project/CLAUDE.md')
    expect(content).toContain('npx dust agent')
    expect(ctx.stdoutLines.join('\n')).toContain('Created CLAUDE.md')
  })

  test('creates AGENTS.md with agent instructions', async () => {
    vi.stubEnv('BUN_INSTALL', '')
    const ctx = createMockContext()
    const fs = createMockFs()

    await init(ctx, fs, [])

    expect(fs.writtenFiles.has('/project/AGENTS.md')).toBe(true)
    const content = fs.writtenFiles.get('/project/AGENTS.md')
    expect(content).toContain('npx dust agent')
    expect(ctx.stdoutLines.join('\n')).toContain('Created AGENTS.md')
  })

  test('warns when CLAUDE.md already exists', async () => {
    vi.stubEnv('BUN_INSTALL', '')
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/CLAUDE.md']))

    await init(ctx, fs, [])

    expect(fs.writtenFiles.has('/project/CLAUDE.md')).toBe(false)
    expect(ctx.stdoutLines.join('\n')).toContain(
      'Warning: CLAUDE.md already exists'
    )
    expect(ctx.stdoutLines.join('\n')).toContain('npx dust agent')
  })

  test('warns when AGENTS.md already exists', async () => {
    vi.stubEnv('BUN_INSTALL', '')
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/AGENTS.md']))

    await init(ctx, fs, [])

    expect(fs.writtenFiles.has('/project/AGENTS.md')).toBe(false)
    expect(ctx.stdoutLines.join('\n')).toContain(
      'Warning: AGENTS.md already exists'
    )
    expect(ctx.stdoutLines.join('\n')).toContain('npx dust agent')
  })

  test('uses bunx when bun.lockb exists', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/bun.lockb']))

    await init(ctx, fs, [])

    const claudeContent = fs.writtenFiles.get('/project/CLAUDE.md')
    expect(claudeContent).toContain('bunx dust agent')
    const agentsContent = fs.writtenFiles.get('/project/AGENTS.md')
    expect(agentsContent).toContain('bunx dust agent')
  })

  test('creates settings.json with npm test for Node.js projects', async () => {
    vi.stubEnv('BUN_INSTALL', '')
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/package.json']))

    await init(ctx, fs, [])

    expect(fs.writtenFiles.has('/project/.dust/config/settings.json')).toBe(
      true
    )
    const content = fs.writtenFiles.get('/project/.dust/config/settings.json')
    const settings = JSON.parse(content ?? '')
    expect(settings.dustCommand).toBe('npx dust')
    expect(settings.checks).toEqual([{ name: 'test', command: 'npm test' }])
  })

  test('creates settings.json with bun test for Bun projects', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/bun.lockb']))

    await init(ctx, fs, [])

    const content = fs.writtenFiles.get('/project/.dust/config/settings.json')
    const settings = JSON.parse(content ?? '')
    expect(settings.dustCommand).toBe('bunx dust')
    expect(settings.checks).toEqual([{ name: 'test', command: 'bun test' }])
  })

  test('creates settings.json with pnpm test for pnpm projects', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/pnpm-lock.yaml']))

    await init(ctx, fs, [])

    const content = fs.writtenFiles.get('/project/.dust/config/settings.json')
    const settings = JSON.parse(content ?? '')
    expect(settings.dustCommand).toBe('pnpx dust')
    expect(settings.checks).toEqual([{ name: 'test', command: 'pnpm test' }])
  })

  test('creates settings.json with empty checks for non-Node projects', async () => {
    vi.stubEnv('BUN_INSTALL', '')
    const ctx = createMockContext()
    const fs = createMockFs()

    await init(ctx, fs, [])

    const content = fs.writtenFiles.get('/project/.dust/config/settings.json')
    const settings = JSON.parse(content ?? '')
    expect(settings.dustCommand).toBe('npx dust')
    expect(settings.checks).toEqual([])
  })

  test('outputs settings creation message', async () => {
    const ctx = createMockContext()
    const fs = createMockFs()

    await init(ctx, fs, [])

    expect(ctx.stdoutLines.join('\n')).toContain(
      'Created settings: .dust/config/settings.json'
    )
  })

  test('uses pnpx when pnpm-lock.yaml exists', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/pnpm-lock.yaml']))

    await init(ctx, fs, [])

    const claudeContent = fs.writtenFiles.get('/project/CLAUDE.md')
    expect(claudeContent).toContain('pnpx dust agent')
    const agentsContent = fs.writtenFiles.get('/project/AGENTS.md')
    expect(agentsContent).toContain('pnpx dust agent')
  })

  test('uses npx when package-lock.json exists', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/package-lock.json']))

    await init(ctx, fs, [])

    const claudeContent = fs.writtenFiles.get('/project/CLAUDE.md')
    expect(claudeContent).toContain('npx dust agent')
    const agentsContent = fs.writtenFiles.get('/project/AGENTS.md')
    expect(agentsContent).toContain('npx dust agent')
  })

  test('uses bunx when BUN_INSTALL env var is set and no lockfiles', async () => {
    vi.stubEnv('BUN_INSTALL', '/home/user/.bun')

    const ctx = createMockContext()
    const fs = createMockFs()

    await init(ctx, fs, [])

    const claudeContent = fs.writtenFiles.get('/project/CLAUDE.md')
    expect(claudeContent).toContain('bunx dust agent')
    const agentsContent = fs.writtenFiles.get('/project/AGENTS.md')
    expect(agentsContent).toContain('bunx dust agent')
  })

  test('outputs suggestions for next steps', async () => {
    vi.stubEnv('BUN_INSTALL', '')
    const ctx = createMockContext()
    const fs = createMockFs()

    await init(ctx, fs, [])

    const output = ctx.stdoutLines.join('\n')
    expect(output).toContain('Commit the changes if you are happy')
    expect(output).toContain('get planning!')
  })

  test('suggestions include examples for new repositories', async () => {
    vi.stubEnv('BUN_INSTALL', '')
    const ctx = createMockContext()
    const fs = createMockFs()

    await init(ctx, fs, [])

    const output = ctx.stdoutLines.join('\n')
    expect(output).toContain('If this is a new repository')
    expect(output).toContain('Idea:')
    expect(output).toContain('Task:')
  })

  test('suggestions include examples for existing codebases', async () => {
    vi.stubEnv('BUN_INSTALL', '')
    const ctx = createMockContext()
    const fs = createMockFs()

    await init(ctx, fs, [])

    const output = ctx.stdoutLines.join('\n')
    expect(output).toContain('If this is an existing codebase')
    expect(output).toContain('goals and facts')
  })

  test('suggestions use npx runner when package-lock.json exists', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/package-lock.json']))

    await init(ctx, fs, [])

    const output = ctx.stdoutLines.join('\n')
    expect(output).toContain('> npx claude')
    expect(output).toContain('> npx codex')
  })

  test('suggestions use bunx runner when bun.lockb exists', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/bun.lockb']))

    await init(ctx, fs, [])

    const output = ctx.stdoutLines.join('\n')
    expect(output).toContain('> bunx claude')
    expect(output).toContain('> bunx codex')
  })

  test('suggestions use pnpx runner when pnpm-lock.yaml exists', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/pnpm-lock.yaml']))

    await init(ctx, fs, [])

    const output = ctx.stdoutLines.join('\n')
    expect(output).toContain('> pnpx claude')
    expect(output).toContain('> pnpx codex')
  })
})

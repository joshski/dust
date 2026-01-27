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
})

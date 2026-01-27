import { describe, expect, test } from 'vitest'
import type {
  CommandContext,
  CommandDependencies,
  FileSystem,
  GlobScanner,
} from '../types'
import { list } from './list'

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

function createMockFs(files: Map<string, string> = new Map()): FileSystem {
  const paths = new Set(files.keys())
  for (const path of files.keys()) {
    let dir = path
    while (dir.includes('/')) {
      dir = dir.substring(0, dir.lastIndexOf('/'))
      if (dir) paths.add(dir)
    }
  }

  return {
    exists: (path: string) => paths.has(path),
    readFile: async (path: string) => files.get(path) || '',
    writeFile: async () => {},
    mkdir: async () => {},
    readdir: async (path: string) => {
      const prefix = `${path}/`
      return Array.from(files.keys())
        .filter(f => f.startsWith(prefix))
        .map(f => f.slice(prefix.length))
        .filter(f => !f.includes('/'))
    },
  }
}

function createMockGlob(): GlobScanner {
  return {
    scan: async function* () {
      // Empty by default
    },
  }
}

function createDeps(
  ctx: CommandContext,
  fs: FileSystem,
  args: string[] = []
): CommandDependencies {
  return {
    arguments: args,
    context: ctx,
    fileSystem: fs,
    globScanner: createMockGlob(),
    settings: { dustCommand: 'dust' },
  }
}

describe('list command', () => {
  test('fails if .dust not found', async () => {
    const ctx = createMockContext()
    const fs = createMockFs()

    const result = await list(createDeps(ctx, fs))

    expect(result.exitCode).toBe(1)
    expect(ctx.stderrLines.join('\n')).toContain('.dust directory not found')
  })

  test('lists all types when no argument given', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(
      new Map([
        ['/project/.dust/goals/goal.md', '# My Goal'],
        ['/project/.dust/ideas/idea.md', '# My Idea'],
        ['/project/.dust/tasks/task.md', '# My Task'],
        ['/project/.dust/facts/fact.md', '# My Fact'],
      ])
    )

    const result = await list(createDeps(ctx, fs))

    expect(result.exitCode).toBe(0)
    const output = ctx.stdoutLines.join('\n')
    expect(output).toContain('goals:')
    expect(output).toContain('ideas:')
    expect(output).toContain('tasks:')
    expect(output).toContain('facts:')
  })

  test('lists only specified type', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(
      new Map([
        ['/project/.dust/goals/goal.md', '# My Goal'],
        ['/project/.dust/ideas/idea.md', '# My Idea'],
      ])
    )

    const result = await list(createDeps(ctx, fs, ['goals']))

    expect(result.exitCode).toBe(0)
    const output = ctx.stdoutLines.join('\n')
    expect(output).toContain('goals:')
    expect(output).not.toContain('ideas:')
  })

  test('shows file name and title', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(
      new Map([['/project/.dust/goals/my-goal.md', '# My Goal Title']])
    )

    await list(createDeps(ctx, fs, ['goals']))

    const output = ctx.stdoutLines.join('\n')
    expect(output).toContain('my-goal')
    expect(output).toContain('My Goal Title')
  })

  test('shows only file name if no title', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(
      new Map([['/project/.dust/goals/my-goal.md', 'No heading here']])
    )

    await list(createDeps(ctx, fs, ['goals']))

    const output = ctx.stdoutLines.join('\n')
    expect(output).toContain('my-goal')
  })

  test('rejects invalid type', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Map([['/project/.dust/goals/g.md', '']]))

    const result = await list(createDeps(ctx, fs, ['invalid']))

    expect(result.exitCode).toBe(1)
    expect(ctx.stderrLines.join('\n')).toContain('Invalid type')
  })

  test('shows valid types on error', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Map([['/project/.dust/goals/g.md', '']]))

    await list(createDeps(ctx, fs, ['invalid']))

    const output = ctx.stderrLines.join('\n')
    expect(output).toContain('tasks')
    expect(output).toContain('ideas')
    expect(output).toContain('goals')
    expect(output).toContain('facts')
  })

  test('skips type directories that do not exist', async () => {
    const ctx = createMockContext()
    // Only goals directory exists, tasks/ideas/facts do not
    const fs = createMockFs(
      new Map([['/project/.dust/goals/my-goal.md', '# My Goal']])
    )

    const result = await list(createDeps(ctx, fs))

    expect(result.exitCode).toBe(0)
    const output = ctx.stdoutLines.join('\n')
    expect(output).toContain('goals:')
    expect(output).toContain('my-goal')
    // Other types should not appear because their directories don't exist
    expect(output).not.toContain('tasks:')
    expect(output).not.toContain('ideas:')
    expect(output).not.toContain('facts:')
  })

  test('skips type directories with no markdown files', async () => {
    const ctx = createMockContext()
    // Create a directory structure where ideas dir exists but has no .md files
    const files = new Map<string, string>([
      ['/project/.dust/goals/my-goal.md', '# My Goal'],
    ])
    const paths = new Set(files.keys())
    // Add directory paths
    for (const path of files.keys()) {
      let dir = path
      while (dir.includes('/')) {
        dir = dir.substring(0, dir.lastIndexOf('/'))
        if (dir) paths.add(dir)
      }
    }
    // Add an empty ideas directory
    paths.add('/project/.dust/ideas')

    const fs = {
      exists: (path: string) => paths.has(path),
      readFile: async (path: string) => files.get(path) || '',
      writeFile: async () => {},
      mkdir: async () => {},
      readdir: async (path: string) => {
        if (path === '/project/.dust/ideas') return [] // Empty directory
        const prefix = `${path}/`
        return Array.from(files.keys())
          .filter(f => f.startsWith(prefix))
          .map(f => f.slice(prefix.length))
          .filter(f => !f.includes('/'))
      },
    }

    const result = await list(createDeps(ctx, fs))

    expect(result.exitCode).toBe(0)
    const output = ctx.stdoutLines.join('\n')
    expect(output).toContain('goals:')
    // ideas exists but has no .md files, so should not be listed
    expect(output).not.toContain('ideas:')
  })
})

import { describe, expect, test } from 'vitest'
import type {
  CommandContext,
  CommandDependencies,
  FileSystem,
  GlobScanner,
} from '../types'
import { generateHelpText, help } from './help'

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

function createMockFileSystem(): FileSystem {
  return {
    exists: () => false,
    readFile: async () => '',
    writeFile: async () => {},
    mkdir: async () => {},
    readdir: async () => [],
  }
}

function createMockGlob(): GlobScanner {
  return {
    scan: async function* () {
      // Empty by default
    },
  }
}

function createDependencies(
  context: CommandContext,
  dustCommand = 'dust'
): CommandDependencies {
  return {
    arguments: [],
    context,
    fileSystem: createMockFileSystem(),
    globScanner: createMockGlob(),
    settings: { dustCommand },
  }
}

describe('help command', () => {
  test('returns exit code 0', async () => {
    const context = createMockContext()

    const result = await help(createDependencies(context))

    expect(result.exitCode).toBe(0)
  })

  test('outputs help text to stdout', async () => {
    const context = createMockContext()

    await help(createDependencies(context))

    expect(context.stdoutLines.length).toBe(1)
    expect(context.stdoutLines[0]).toContain('dust')
  })

  test('uses dustCommand from settings', async () => {
    const context = createMockContext()

    await help(createDependencies(context, 'bunx dust'))

    expect(context.stdoutLines[0]).toContain('bunx dust')
  })
})

describe('generateHelpText', () => {
  test('generates help text with default command', () => {
    const text = generateHelpText({ dustCommand: 'dust' })

    expect(text).toContain('dust')
    expect(text).toContain('init')
    expect(text).toContain('lint markdown')
  })

  test('generates help text with custom command', () => {
    const text = generateHelpText({ dustCommand: 'bunx dust' })

    expect(text).toContain('bunx dust')
  })
})

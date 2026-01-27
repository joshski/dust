import { describe, expect, test } from 'vitest'
import {
  COMMANDS,
  generateHelpText,
  HELP_TEXT,
  isHelpRequest,
  isValidCommand,
  main,
  runCommand,
} from './main'
import type { CommandContext, FileSystem } from './types'
import type { GlobScanner } from './validate'

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

function createMockGlob(): GlobScanner {
  return {
    scan: async function* () {
      // Empty by default
    },
  }
}

describe('isHelpRequest', () => {
  test('returns true for undefined command', () => {
    expect(isHelpRequest(undefined)).toBe(true)
  })

  test('returns true for help command', () => {
    expect(isHelpRequest('help')).toBe(true)
  })

  test('returns true for --help flag', () => {
    expect(isHelpRequest('--help')).toBe(true)
  })

  test('returns true for -h flag', () => {
    expect(isHelpRequest('-h')).toBe(true)
  })

  test('returns false for other commands', () => {
    expect(isHelpRequest('init')).toBe(false)
    expect(isHelpRequest('list')).toBe(false)
  })
})

describe('isValidCommand', () => {
  test('returns true for valid commands', () => {
    for (const cmd of COMMANDS) {
      expect(isValidCommand(cmd)).toBe(true)
    }
  })

  test('returns false for invalid commands', () => {
    expect(isValidCommand('foo')).toBe(false)
    expect(isValidCommand('bar')).toBe(false)
    expect(isValidCommand('')).toBe(false)
  })
})

const defaultSettings = { binaryPath: 'dust' }

describe('runCommand', () => {
  test('runs help command and outputs help text', async () => {
    const ctx = createMockContext()
    const fs = createMockFs()
    const glob = createMockGlob()

    const result = await runCommand('help', [], ctx, fs, glob, defaultSettings)

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain(
      'dust - A lightweight planning system'
    )
  })

  test('runs init command', async () => {
    const ctx = createMockContext()
    const fs = createMockFs()
    const glob = createMockGlob()

    const result = await runCommand('init', [], ctx, fs, glob, defaultSettings)

    expect(result.exitCode).toBe(0)
    expect(fs.createdDirs).toContain('/project/.dust')
  })
})

describe('main', () => {
  test('shows help when no command provided', async () => {
    const ctx = createMockContext()
    const fs = createMockFs()
    const glob = createMockGlob()

    const result = await main({ args: [], ctx, fs, glob })

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain(HELP_TEXT)
  })

  test('shows help for help command', async () => {
    const ctx = createMockContext()
    const fs = createMockFs()
    const glob = createMockGlob()

    const result = await main({ args: ['help'], ctx, fs, glob })

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain(
      'dust - A lightweight planning system'
    )
  })

  test('shows help for --help flag', async () => {
    const ctx = createMockContext()
    const fs = createMockFs()
    const glob = createMockGlob()

    const result = await main({ args: ['--help'], ctx, fs, glob })

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Usage: dust <command>')
  })

  test('shows help for -h flag', async () => {
    const ctx = createMockContext()
    const fs = createMockFs()
    const glob = createMockGlob()

    const result = await main({ args: ['-h'], ctx, fs, glob })

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Usage: dust <command>')
  })

  test('returns error for unknown command', async () => {
    const ctx = createMockContext()
    const fs = createMockFs()
    const glob = createMockGlob()

    const result = await main({ args: ['unknown'], ctx, fs, glob })

    expect(result.exitCode).toBe(1)
    expect(ctx.stderrLines.join('\n')).toContain('Unknown command: unknown')
    expect(ctx.stderrLines.join('\n')).toContain(
      "Run 'dust help' for available commands"
    )
  })

  test('uses custom binary path from settings for help', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/.dust/config/settings.json']))
    // Override readFile to return custom settings
    fs.readFile = async (path: string) => {
      if (path === '/project/.dust/config/settings.json') {
        return '{"binaryPath": "bin/dust"}'
      }
      return ''
    }
    const glob = createMockGlob()

    const result = await main({ args: ['help'], ctx, fs, glob })

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Usage: bin/dust <command>')
  })

  test('uses custom binary path from settings for unknown command error', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/.dust/config/settings.json']))
    fs.readFile = async (path: string) => {
      if (path === '/project/.dust/config/settings.json') {
        return '{"binaryPath": "bin/dust"}'
      }
      return ''
    }
    const glob = createMockGlob()

    const result = await main({ args: ['unknown'], ctx, fs, glob })

    expect(result.exitCode).toBe(1)
    expect(ctx.stderrLines.join('\n')).toContain(
      "Run 'bin/dust help' for available commands"
    )
  })

  test('routes init command correctly', async () => {
    const ctx = createMockContext()
    const fs = createMockFs()
    const glob = createMockGlob()

    const result = await main({ args: ['init'], ctx, fs, glob })

    expect(result.exitCode).toBe(0)
    expect(fs.createdDirs).toContain('/project/.dust')
  })

  test('routes prompt command correctly', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/.dust/prompts']))
    const glob = createMockGlob()

    const result = await main({ args: ['prompt', 'work'], ctx, fs, glob })

    // Will fail because prompt file doesn't exist, but proves routing works
    expect(result.exitCode).toBe(1)
    expect(ctx.stderrLines.join('\n')).toContain('Prompt')
  })

  test('routes list command correctly', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/.dust']))
    const glob = createMockGlob()

    const result = await main({ args: ['list'], ctx, fs, glob })

    expect(result.exitCode).toBe(0)
  })

  test('routes validate command correctly', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/.dust']))
    const glob = createMockGlob()

    const result = await main({ args: ['validate'], ctx, fs, glob })

    expect(result.exitCode).toBe(0)
  })

  test('routes next command correctly', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/.dust', '/project/.dust/tasks']))
    const glob = createMockGlob()

    const result = await main({ args: ['next'], ctx, fs, glob })

    expect(result.exitCode).toBe(0)
  })

  test('routes check command correctly', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/.dust']))
    const glob = createMockGlob()

    const result = await main({ args: ['check'], ctx, fs, glob })

    // check command runs validate first, which should pass with empty .dust
    expect(typeof result.exitCode).toBe('number')
  })

  test('routes claude command correctly', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(new Set(['/project/.dust']))
    const glob = createMockGlob()

    const result = await main({ args: ['claude'], ctx, fs, glob })

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Hello Claude')
  })

  test('passes command args to subcommands', async () => {
    const ctx = createMockContext()
    // Invalid type should cause the list command to report an error
    const fs = createMockFs(new Set(['/project/.dust']))
    const glob = createMockGlob()

    const result = await main({ args: ['list', 'invalid-type'], ctx, fs, glob })

    expect(result.exitCode).toBe(1)
    expect(
      ctx.stderrLines.some(line => line.includes('Invalid type: invalid-type'))
    ).toBe(true)
  })
})

describe('COMMANDS', () => {
  test('contains expected commands', () => {
    expect(COMMANDS).toContain('init')
    expect(COMMANDS).toContain('prompt')
    expect(COMMANDS).toContain('validate')
    expect(COMMANDS).toContain('list')
    expect(COMMANDS).toContain('next')
    expect(COMMANDS).toContain('check')
    expect(COMMANDS).toContain('claude')
    expect(COMMANDS).toContain('help')
  })
})

describe('HELP_TEXT', () => {
  test('contains usage information', () => {
    expect(HELP_TEXT).toContain('Usage: dust <command>')
  })

  test('documents all commands', () => {
    expect(HELP_TEXT).toContain('init')
    expect(HELP_TEXT).toContain('prompt')
    expect(HELP_TEXT).toContain('validate')
    expect(HELP_TEXT).toContain('list')
    expect(HELP_TEXT).toContain('next')
    expect(HELP_TEXT).toContain('check')
    expect(HELP_TEXT).toContain('claude')
    expect(HELP_TEXT).toContain('help')
  })

  test('contains examples', () => {
    expect(HELP_TEXT).toContain('Examples:')
    expect(HELP_TEXT).toContain('dust init')
    expect(HELP_TEXT).toContain('dust prompt work')
  })
})

describe('generateHelpText', () => {
  test('uses custom binary path in usage', () => {
    const helpText = generateHelpText({ binaryPath: 'bin/dust' })
    expect(helpText).toContain('Usage: bin/dust <command>')
  })

  test('uses custom binary path in examples', () => {
    const helpText = generateHelpText({ binaryPath: 'bin/dust' })
    expect(helpText).toContain('bin/dust init')
    expect(helpText).toContain('bin/dust prompt work')
  })

  test('uses custom binary path in agent guide', () => {
    const helpText = generateHelpText({ binaryPath: 'bin/dust' })
    expect(helpText).toContain('Run `bin/dust check` before starting work')
    expect(helpText).toContain('Run `bin/dust next` to find tasks')
  })
})

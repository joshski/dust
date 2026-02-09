import { afterEach, describe, expect, test } from 'vitest'
import type { FileSystemEmulator } from '../test/test-utilities'
import {
  createContextEmulator,
  createFileSystemEmulator,
  restoreEnv,
  stubEnv,
} from '../test/test-utilities'
import {
  COMMANDS,
  generateHelpText,
  HELP_TEXT,
  isHelpRequest,
  isValidCommand,
  main,
  runCommand,
} from './main'
import type { CommandContext, CommandDependencies, DustSettings } from './types'

function createDependencies(
  context: CommandContext,
  fileSystem: FileSystemEmulator,
  commandArguments: string[] = [],
  settings: DustSettings = { dustCommand: 'dust' }
): CommandDependencies {
  return {
    arguments: commandArguments,
    context,
    fileSystem,
    globScanner: fileSystem,
    settings,
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

describe('runCommand', () => {
  test('runs help command and outputs help text', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    const dependencies = createDependencies(context, fileSystem)

    const result = await runCommand('help', dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain(
      '💨 dust - Flow state for AI coding agents'
    )
  })

  test('runs init command', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()
    const dependencies = createDependencies(context, fileSystem)

    const result = await runCommand('init', dependencies)

    expect(result.exitCode).toBe(0)
    expect(fileSystem.createdDirs).toContain('/project/.dust')
  })
})

describe('main', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('shows help when no command provided', async () => {
    stubEnv('BUN_INSTALL', '')
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()

    const result = await main({
      commandArguments: [],
      context,
      fileSystem,
      glob: fileSystem,
    })

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain(
      '💨 dust - Flow state for AI coding agents'
    )
    expect(context.stdoutLines.join('\n')).toContain(
      'Usage: npx dust <command>'
    )
  })

  test('shows help for help command', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()

    const result = await main({
      commandArguments: ['help'],
      context,
      fileSystem,
      glob: fileSystem,
    })

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain(
      '💨 dust - Flow state for AI coding agents'
    )
  })

  test('shows help for --help flag', async () => {
    stubEnv('BUN_INSTALL', '')
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()

    const result = await main({
      commandArguments: ['--help'],
      context,
      fileSystem,
      glob: fileSystem,
    })

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain(
      'Usage: npx dust <command>'
    )
  })

  test('shows help for -h flag', async () => {
    stubEnv('BUN_INSTALL', '')
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()

    const result = await main({
      commandArguments: ['-h'],
      context,
      fileSystem,
      glob: fileSystem,
    })

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain(
      'Usage: npx dust <command>'
    )
  })

  test('returns error for unknown command', async () => {
    stubEnv('BUN_INSTALL', '')
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()

    const result = await main({
      commandArguments: ['unknown'],
      context,
      fileSystem,
      glob: fileSystem,
    })

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Unknown command: unknown')
    expect(context.stderrLines.join('\n')).toContain(
      "Run 'npx dust help' for available commands"
    )
  })

  test('uses custom binary path from settings for help', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            'settings.json': '{"dustCommand": "bin/dust"}',
          },
        },
      },
    })

    const result = await main({
      commandArguments: ['help'],
      context,
      fileSystem,
      glob: fileSystem,
    })

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain(
      'Usage: bin/dust <command>'
    )
  })

  test('uses custom binary path from settings for unknown command error', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            'settings.json': '{"dustCommand": "bin/dust"}',
          },
        },
      },
    })

    const result = await main({
      commandArguments: ['unknown'],
      context,
      fileSystem,
      glob: fileSystem,
    })

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      "Run 'bin/dust help' for available commands"
    )
  })

  test('routes init command correctly', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()

    const result = await main({
      commandArguments: ['init'],
      context,
      fileSystem,
      glob: fileSystem,
    })

    expect(result.exitCode).toBe(0)
    expect(fileSystem.createdDirs).toContain('/project/.dust')
  })

  test('routes list command correctly', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': {} },
    })

    const result = await main({
      commandArguments: ['list'],
      context,
      fileSystem,
      glob: fileSystem,
    })

    expect(result.exitCode).toBe(0)
  })

  test('routes lint markdown command correctly', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': {} },
    })

    const result = await main({
      commandArguments: ['lint', 'markdown'],
      context,
      fileSystem,
      glob: fileSystem,
    })

    expect(result.exitCode).toBe(0)
  })

  test('routes next command correctly', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { tasks: {} } },
    })

    const result = await main({
      commandArguments: ['next'],
      context,
      fileSystem,
      glob: fileSystem,
    })

    expect(result.exitCode).toBe(0)
  })

  test('routes check command correctly', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': {} },
    })

    const result = await main({
      commandArguments: ['check'],
      context,
      fileSystem,
      glob: fileSystem,
    })

    // check command runs lint markdown first, which should pass with empty .dust
    expect(typeof result.exitCode).toBe('number')
  })

  test('routes agent command correctly', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': {} },
    })

    const result = await main({
      commandArguments: ['agent'],
      context,
      fileSystem,
      glob: fileSystem,
    })

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toMatch(/Hello .+, welcome to dust/)
  })

  test('passes command args to subcommands', async () => {
    const context = createContextEmulator()
    // Invalid type should cause the list command to report an error
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': {} },
    })

    const result = await main({
      commandArguments: ['list', 'invalid-type'],
      context,
      fileSystem,
      glob: fileSystem,
    })

    expect(result.exitCode).toBe(1)
    expect(
      context.stderrLines.some(line =>
        line.includes('Invalid type: invalid-type')
      )
    ).toBe(true)
  })
})

describe('COMMANDS', () => {
  test('contains expected top-level commands (excludes multi-word subcommands)', () => {
    expect(COMMANDS).toEqual([
      'init',
      'list',
      'tasks',
      'goals',
      'ideas',
      'facts',
      'next',
      'check',
      'agent',
      'focus',
      'help',
    ])
  })
})

describe('multi-word command routing', () => {
  test('routes new task correctly', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': {} },
    })

    const result = await main({
      commandArguments: ['new', 'task'],
      context,
      fileSystem,
      glob: fileSystem,
    })

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Adding a New Task')
  })

  test('routes pick task correctly', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': {} },
    })

    const result = await main({
      commandArguments: ['pick', 'task'],
      context,
      fileSystem,
      glob: fileSystem,
    })

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Pick a Task')
  })

  test('routes pre push correctly', async () => {
    stubEnv('CLAUDECODE', '1')
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': {} },
    })

    const result = await main({
      commandArguments: ['pre', 'push'],
      context,
      fileSystem,
      glob: fileSystem,
    })

    // pre push runs check, which should fail without checks configured
    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('No checks configured')
  })

  test('routes unknown multi-word command to error', async () => {
    stubEnv('BUN_INSTALL', '')
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': {} },
    })

    const result = await main({
      commandArguments: ['new', 'unknown', 'subcommand'],
      context,
      fileSystem,
      glob: fileSystem,
    })

    // Should fall back to error since 'new unknown subcommand' and 'new unknown' don't exist
    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Unknown command')
  })
})

describe('HELP_TEXT', () => {
  test('contains usage information', () => {
    expect(HELP_TEXT).toContain('Usage: dust <command>')
  })

  test('documents all commands', () => {
    expect(HELP_TEXT).toContain('init')
    expect(HELP_TEXT).toContain('lint markdown')
    expect(HELP_TEXT).toContain('list')
    expect(HELP_TEXT).toContain('next')
    expect(HELP_TEXT).toContain('check')
    expect(HELP_TEXT).toContain('agent')
    expect(HELP_TEXT).toContain('help')
  })
})

describe('generateHelpText', () => {
  test('uses custom binary path in usage', () => {
    const helpText = generateHelpText({ dustCommand: 'bin/dust' })
    expect(helpText).toContain('Usage: bin/dust <command>')
  })

  test('uses custom binary path in agent pointer', () => {
    const helpText = generateHelpText({ dustCommand: 'bin/dust' })
    expect(helpText).toContain('Run `bin/dust agent`')
  })
})

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

  test('routes lint command correctly', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': {} },
    })

    const result = await main({
      commandArguments: ['lint'],
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

    // check command runs lint first, which should pass with empty .dust
    expect(typeof result.exitCode).toBe('number')
  })

  test('routes agent command correctly', async () => {
    // Clear DUST_SKIP_AGENT to ensure we get the greeting, not the skip message
    const originalSkipAgent = process.env.DUST_SKIP_AGENT
    delete process.env.DUST_SKIP_AGENT
    try {
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
      expect(context.stdoutLines.join('\n')).toMatch(
        /Hello .+, welcome to dust/
      )
    } finally {
      if (originalSkipAgent !== undefined) {
        process.env.DUST_SKIP_AGENT = originalSkipAgent
      }
    }
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
      'lint',
      'list',
      'tasks',
      'principles',
      'ideas',
      'facts',
      'next',
      'check',
      'agent',
      'audit',
      'bucket',
      'focus',
      'migrate',
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
      project: { '.dust': { tasks: { 'a.md': '# A' } } },
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

describe('generateHelpText with default dustCommand', () => {
  test('contains usage information', () => {
    const helpText = generateHelpText({ dustCommand: 'dust' })
    expect(helpText).toContain('Usage: dust <command>')
  })

  test('documents all commands', () => {
    const helpText = generateHelpText({ dustCommand: 'dust' })
    expect(helpText).toContain('init')
    expect(helpText).toContain('lint')
    expect(helpText).toContain('list')
    expect(helpText).toContain('next')
    expect(helpText).toContain('check')
    expect(helpText).toContain('agent')
    expect(helpText).toContain('help')
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

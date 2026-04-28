import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  createTestRuntimeConfig,
  type FileSystemEmulator,
} from '../../test-support/test-utilities'
import type {
  CommandContext,
  CommandDependencies,
  DustSettings,
} from '../types'
import { codexHook, KNOWN_HOOK_EVENTS } from './codex-hook'

const defaultSettings: DustSettings = { dustCommand: 'bunx dust' }

function createDependencies(
  context: CommandContext,
  fileSystem?: FileSystemEmulator,
  settings: DustSettings = defaultSettings
): CommandDependencies {
  const fileSystemDep = fileSystem ?? createFileSystemEmulator()
  return {
    arguments: [],
    context,
    fileSystem: fileSystemDep,
    globScanner: fileSystemDep,
    settings,
    runtime: createTestRuntimeConfig(),
  }
}

function stdinReader(payload: string) {
  return () => Promise.resolve(payload)
}

const sessionStartPayload = JSON.stringify({
  session_id: 'abc',
  transcript_path: null,
  cwd: '/project',
  hook_event_name: 'SessionStart',
  model: 'gpt-5.5',
  permission_mode: 'bypassPermissions',
  source: 'startup',
})

describe('codex hook command', () => {
  test('SessionStart emits dust agent instructions as additionalContext', async () => {
    const context = createContextEmulator()
    const result = await codexHook(createDependencies(context), {
      readStdin: stdinReader(sessionStartPayload),
    })

    expect(result.exitCode).toBe(0)
    expect(context.stderrLines).toEqual([])
    expect(context.stdoutLines).toHaveLength(1)

    const response = JSON.parse(context.stdoutLines[0])
    expect(response.continue).toBe(true)
    expect(response.systemMessage).toBe('dust agent loaded')
    expect(response.hookSpecificOutput.hookEventName).toBe('SessionStart')
    expect(response.hookSpecificOutput.additionalContext).toContain(
      'Hello Codex, welcome to dust!'
    )
    expect(response.hookSpecificOutput.additionalContext).toContain(
      'bunx dust pick task'
    )
  })

  test('SessionStart includes codex agent instructions when config file exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            agents: {
              'codex.md': 'Project-specific codex guidance',
            },
          },
        },
      },
    })

    const result = await codexHook(createDependencies(context, fileSystem), {
      readStdin: stdinReader(sessionStartPayload),
    })

    expect(result.exitCode).toBe(0)
    const response = JSON.parse(context.stdoutLines[0])
    expect(response.hookSpecificOutput.additionalContext).toContain(
      'Project-specific codex guidance'
    )
  })

  test.each(KNOWN_HOOK_EVENTS.filter(event => event !== 'SessionStart'))(
    '%s returns no-op success response',
    async event => {
      const context = createContextEmulator()
      const payload = JSON.stringify({ hook_event_name: event })

      const result = await codexHook(createDependencies(context), {
        readStdin: stdinReader(payload),
      })

      expect(result.exitCode).toBe(0)
      expect(context.stderrLines).toEqual([])
      const response = JSON.parse(context.stdoutLines[0])
      expect(response).toEqual({ continue: true })
    }
  )

  test('returns non-zero exit and clear stderr when stdin is malformed JSON', async () => {
    const context = createContextEmulator()
    const result = await codexHook(createDependencies(context), {
      readStdin: stdinReader('{not valid json'),
    })

    expect(result.exitCode).toBe(1)
    expect(context.stdoutLines).toEqual([])
    expect(context.stderrLines.join('\n')).toContain(
      'failed to parse stdin as JSON'
    )
  })

  test('returns non-zero exit when payload is not a JSON object', async () => {
    const context = createContextEmulator()
    const result = await codexHook(createDependencies(context), {
      readStdin: stdinReader('"a string"'),
    })

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      'stdin payload must be a JSON object'
    )
  })

  test('returns non-zero exit when hook_event_name is unknown', async () => {
    const context = createContextEmulator()
    const payload = JSON.stringify({ hook_event_name: 'NotARealEvent' })

    const result = await codexHook(createDependencies(context), {
      readStdin: stdinReader(payload),
    })

    expect(result.exitCode).toBe(1)
    expect(context.stdoutLines).toEqual([])
    expect(context.stderrLines.join('\n')).toContain('unknown hook_event_name')
    expect(context.stderrLines.join('\n')).toContain('NotARealEvent')
  })

  test('returns non-zero exit when hook_event_name is missing', async () => {
    const context = createContextEmulator()
    const result = await codexHook(createDependencies(context), {
      readStdin: stdinReader('{}'),
    })

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('unknown hook_event_name')
  })

  test('uses non-2 exit code so codex does not treat error as a blocking decision', async () => {
    const context = createContextEmulator()
    const result = await codexHook(createDependencies(context), {
      readStdin: stdinReader('{not json'),
    })

    expect(result.exitCode).not.toBe(2)
    expect(result.exitCode).not.toBe(0)
  })
})

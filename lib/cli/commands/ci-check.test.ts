import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
} from '../../test/test-utilities'
import type { ShellRunner } from '../process-runner'
import type {
  CommandContext,
  CommandDependencies,
  DustSettings,
} from '../types'
import { ciCheck, parseAttempts, renderFailureTask } from './ci-check'

function createMockShellRunner(
  results: Record<
    string,
    { exitCode: number; output: string; timedOut?: boolean }
  >
): ShellRunner {
  return {
    run: async (command, _cwd, _timeoutMs) => {
      return results[command] ?? { exitCode: 0, output: '' }
    },
  }
}

function createDependencies(
  context: CommandContext,
  fileSystem: FileSystemEmulator,
  settings: DustSettings
): CommandDependencies {
  return {
    arguments: [],
    context,
    fileSystem,
    globScanner: fileSystem,
    settings,
  }
}

const defaultSettings: DustSettings = {
  dustCommand: 'dust',
  checks: [{ name: 'test', command: 'npm test' }],
}

describe('parseAttempts', () => {
  test('extracts attempt count from task content', () => {
    const content = '# Fix CI Failure\n\n## Attempts\n\n3\n\n## Goals'
    expect(parseAttempts(content)).toBe(3)
  })

  test('returns 0 when no Attempts section exists', () => {
    const content = '# Fix CI Failure\n\n## Goals\n\n(none)'
    expect(parseAttempts(content)).toBe(0)
  })

  test('returns 0 when Attempts section has no number', () => {
    const content = '# Fix CI Failure\n\n## Attempts\n\n\n## Goals'
    expect(parseAttempts(content)).toBe(0)
  })
})

describe('renderFailureTask', () => {
  test('renders unblocked task with failure log and attempt count', () => {
    const result = renderFailureTask('check output here', 1, false)
    expect(result).toContain('# Fix CI Failure')
    expect(result).toContain('check output here')
    expect(result).toContain('## Attempts\n\n1')
    expect(result).toContain('## Blocked By\n\n(none)')
    expect(result).toContain('## Definition of Done')
  })

  test('renders self-blocked task when circuit breaker triggers', () => {
    const result = renderFailureTask('check output', 4, true)
    expect(result).toContain(
      '## Blocked By\n\n- [fix-ci-failure](fix-ci-failure.md)'
    )
    expect(result).toContain('## Attempts\n\n4')
  })
})

describe('ci check - checks pass', () => {
  test('returns exitCode 0 when all checks pass', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { tasks: {} } },
    })
    const runner = createMockShellRunner({
      'npm test': { exitCode: 0, output: 'All tests pass' },
    })

    const result = await ciCheck(
      createDependencies(context, fileSystem, defaultSettings),
      runner
    )

    expect(result.exitCode).toBe(0)
  })

  test('cleans up existing failure task when checks pass', async () => {
    const context = createContextEmulator()
    const existingTask = renderFailureTask('old output', 2, false)
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: { 'fix-ci-failure.md': existingTask },
        },
      },
    })
    const runner = createMockShellRunner({
      'npm test': { exitCode: 0, output: '' },
    })

    const result = await ciCheck(
      createDependencies(context, fileSystem, defaultSettings),
      runner
    )

    expect(result.exitCode).toBe(0)
    expect(fileSystem.unlinkedFiles).toContain(
      '/project/.dust/tasks/fix-ci-failure.md'
    )
    expect(context.stdoutLines.join('\n')).toContain(
      'Removed .dust/tasks/fix-ci-failure.md'
    )
  })

  test('does not error when no failure task exists on success', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { tasks: {} } },
    })
    const runner = createMockShellRunner({
      'npm test': { exitCode: 0, output: '' },
    })

    const result = await ciCheck(
      createDependencies(context, fileSystem, defaultSettings),
      runner
    )

    expect(result.exitCode).toBe(0)
    expect(fileSystem.unlinkedFiles).toHaveLength(0)
  })
})

describe('ci check - first failure', () => {
  test('creates failure task on first failure', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { tasks: {} } },
    })
    const runner = createMockShellRunner({
      'npm test': { exitCode: 1, output: 'Test failed: expected 1 to equal 2' },
    })

    const result = await ciCheck(
      createDependencies(context, fileSystem, defaultSettings),
      runner
    )

    expect(result.exitCode).toBe(1)

    // Task file should be created
    const taskContent = fileSystem.files.get(
      '/project/.dust/tasks/fix-ci-failure.md'
    )
    expect(taskContent).toBeDefined()
    expect(taskContent).toContain('# Fix CI Failure')
    expect(taskContent).toContain('## Attempts\n\n1')
    expect(taskContent).toContain('## Blocked By\n\n(none)')
    expect(context.stdoutLines.join('\n')).toContain(
      'Created .dust/tasks/fix-ci-failure.md (attempt 1/3)'
    )
  })

  test('creates tasks directory if it does not exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { config: {} } },
    })
    const runner = createMockShellRunner({
      'npm test': { exitCode: 1, output: 'Error' },
    })

    await ciCheck(
      createDependencies(context, fileSystem, defaultSettings),
      runner
    )

    expect(fileSystem.createdDirs).toContain('/project/.dust/tasks')
    expect(fileSystem.files.has('/project/.dust/tasks/fix-ci-failure.md')).toBe(
      true
    )
  })

  test('captures check output in failure log', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { tasks: {} } },
    })
    const runner = createMockShellRunner({
      'npm test': { exitCode: 1, output: 'Error: assertion failed at line 42' },
    })

    await ciCheck(
      createDependencies(context, fileSystem, defaultSettings),
      runner
    )

    const taskContent = fileSystem.files.get(
      '/project/.dust/tasks/fix-ci-failure.md'
    )
    expect(taskContent).toContain('assertion failed at line 42')
  })
})

describe('ci check - subsequent failures', () => {
  test('increments attempt count on subsequent failure', async () => {
    const context = createContextEmulator()
    const existingTask = renderFailureTask('old output', 2, false)
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: { 'fix-ci-failure.md': existingTask },
        },
      },
    })
    const runner = createMockShellRunner({
      'npm test': { exitCode: 1, output: 'Still failing' },
    })

    await ciCheck(
      createDependencies(context, fileSystem, defaultSettings),
      runner
    )

    const taskContent = fileSystem.files.get(
      '/project/.dust/tasks/fix-ci-failure.md'
    )
    expect(taskContent).toContain('## Attempts\n\n3')
    expect(taskContent).toContain('Still failing')
    expect(context.stdoutLines.join('\n')).toContain(
      'Updated .dust/tasks/fix-ci-failure.md (attempt 3/3)'
    )
  })

  test('updates failure log with latest output', async () => {
    const context = createContextEmulator()
    const existingTask = renderFailureTask('old failure log', 1, false)
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: { 'fix-ci-failure.md': existingTask },
        },
      },
    })
    const runner = createMockShellRunner({
      'npm test': { exitCode: 1, output: 'new failure log' },
    })

    await ciCheck(
      createDependencies(context, fileSystem, defaultSettings),
      runner
    )

    const taskContent = fileSystem.files.get(
      '/project/.dust/tasks/fix-ci-failure.md'
    )
    expect(taskContent).toContain('new failure log')
    expect(taskContent).not.toContain('old failure log')
  })
})

describe('ci check - circuit breaker', () => {
  test('self-blocks task after max attempts exceeded', async () => {
    const context = createContextEmulator()
    const existingTask = renderFailureTask('output', 3, false)
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: { 'fix-ci-failure.md': existingTask },
        },
      },
    })
    const runner = createMockShellRunner({
      'npm test': { exitCode: 1, output: 'Still broken' },
    })

    await ciCheck(
      createDependencies(context, fileSystem, defaultSettings),
      runner
    )

    const taskContent = fileSystem.files.get(
      '/project/.dust/tasks/fix-ci-failure.md'
    )
    expect(taskContent).toContain('## Attempts\n\n4')
    expect(taskContent).toContain(
      '## Blocked By\n\n- [fix-ci-failure](fix-ci-failure.md)'
    )
    expect(context.stdoutLines.join('\n')).toContain('Circuit breaker')
    expect(context.stdoutLines.join('\n')).toContain('Human intervention')
  })

  test('does not update already self-blocked task', async () => {
    const context = createContextEmulator()
    const selfBlockedTask = renderFailureTask('old output', 4, true)
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: { 'fix-ci-failure.md': selfBlockedTask },
        },
      },
    })
    const runner = createMockShellRunner({
      'npm test': { exitCode: 1, output: 'new output' },
    })

    await ciCheck(
      createDependencies(context, fileSystem, defaultSettings),
      runner
    )

    // Task should NOT be updated - still has old content
    const taskContent = fileSystem.files.get(
      '/project/.dust/tasks/fix-ci-failure.md'
    )
    expect(taskContent).toContain('old output')
    expect(taskContent).not.toContain('new output')
    expect(context.stdoutLines.join('\n')).toContain('self-blocked')
    expect(context.stdoutLines.join('\n')).toContain(
      'Human intervention required'
    )
  })

  test('respects custom ciMaxAttempts from settings', async () => {
    const context = createContextEmulator()
    const existingTask = renderFailureTask('output', 5, false)
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: { 'fix-ci-failure.md': existingTask },
        },
      },
    })
    const settings: DustSettings = {
      ...defaultSettings,
      ciMaxAttempts: 5,
    }
    const runner = createMockShellRunner({
      'npm test': { exitCode: 1, output: 'Failed' },
    })

    await ciCheck(createDependencies(context, fileSystem, settings), runner)

    const taskContent = fileSystem.files.get(
      '/project/.dust/tasks/fix-ci-failure.md'
    )
    expect(taskContent).toContain('## Attempts\n\n6')
    expect(taskContent).toContain(
      '## Blocked By\n\n- [fix-ci-failure](fix-ci-failure.md)'
    )
    expect(context.stdoutLines.join('\n')).toContain('5 attempts exhausted')
  })

  test('with ciMaxAttempts of 1 self-blocks after first retry', async () => {
    const context = createContextEmulator()
    const existingTask = renderFailureTask('output', 1, false)
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: { 'fix-ci-failure.md': existingTask },
        },
      },
    })
    const settings: DustSettings = {
      ...defaultSettings,
      ciMaxAttempts: 1,
    }
    const runner = createMockShellRunner({
      'npm test': { exitCode: 1, output: 'Failed again' },
    })

    await ciCheck(createDependencies(context, fileSystem, settings), runner)

    const taskContent = fileSystem.files.get(
      '/project/.dust/tasks/fix-ci-failure.md'
    )
    expect(taskContent).toContain(
      '## Blocked By\n\n- [fix-ci-failure](fix-ci-failure.md)'
    )
  })
})

describe('ci check - still displays check output', () => {
  test('displays check output to stdout while capturing it', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { tasks: {} } },
    })
    const runner = createMockShellRunner({
      'npm test': { exitCode: 1, output: 'Test error details' },
    })

    await ciCheck(
      createDependencies(context, fileSystem, defaultSettings),
      runner
    )

    // check command outputs its own formatted results to stdout
    expect(context.stdoutLines.join('\n')).toContain('test')
    expect(context.stdoutLines.join('\n')).toContain('checks passed')
  })
})

describe('ci check - no checks configured', () => {
  test('returns error when no checks configured', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { tasks: {} } },
    })
    const settings: DustSettings = { dustCommand: 'dust' }
    const runner = createMockShellRunner({})

    const result = await ciCheck(
      createDependencies(context, fileSystem, settings),
      runner
    )

    expect(result.exitCode).toBe(1)
    // Should create a failure task for the misconfiguration error too
    expect(fileSystem.files.has('/project/.dust/tasks/fix-ci-failure.md')).toBe(
      true
    )
  })
})

describe('ci check - malformed existing task', () => {
  test('treats task without Blocked By section as not self-blocked', async () => {
    const context = createContextEmulator()
    // Manually crafted task missing the "Blocked By" section entirely
    const malformedTask =
      '# Fix CI Failure\n\nFix things.\n\n## Attempts\n\n2\n\n## Goals\n\n(none)\n\n## Definition of Done\n\n- [ ] pass\n'
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: { 'fix-ci-failure.md': malformedTask },
        },
      },
    })
    const runner = createMockShellRunner({
      'npm test': { exitCode: 1, output: 'Still failing' },
    })

    await ciCheck(
      createDependencies(context, fileSystem, defaultSettings),
      runner
    )

    // Should increment attempts (task not considered self-blocked)
    const taskContent = fileSystem.files.get(
      '/project/.dust/tasks/fix-ci-failure.md'
    )
    expect(taskContent).toContain('## Attempts\n\n3')
  })
})

describe('file system emulator - unlink', () => {
  test('throws ENOENT when unlinking non-existent file', async () => {
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { tasks: {} } },
    })

    await expect(
      fileSystem.unlink('/project/.dust/tasks/does-not-exist.md')
    ).rejects.toThrow('ENOENT')
  })
})

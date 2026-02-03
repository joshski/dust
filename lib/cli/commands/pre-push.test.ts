import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
} from '../../test/test-utilities'
import type {
  CommandContext,
  CommandDependencies,
  DustSettings,
} from '../types'
import {
  analyzeChangesForTaskOnlyPattern,
  createGitRunner,
  type FileChange,
  type GitRunner,
  parseGitDiffNameStatus,
  prePush,
} from './pre-push'

function createMockGitRunner(
  results: Record<string, { exitCode: number; output: string }>
): GitRunner & {
  calls: Array<{ gitArgs: string[]; cwd: string }>
} {
  const calls: Array<{ gitArgs: string[]; cwd: string }> = []
  return {
    run: async (gitArgs, cwd) => {
      calls.push({ gitArgs, cwd })
      // Find matching result by checking if gitArgs match
      const key = gitArgs.join(' ')
      return results[key] ?? { exitCode: 1, output: '' }
    },
    calls,
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
  dustCommand: 'bin/dust',
  checks: [{ name: 'test', command: 'npm test' }],
}

describe('parseGitDiffNameStatus', () => {
  test('parses added files', () => {
    const output = 'A\t.dust/tasks/my-task.md'
    const changes = parseGitDiffNameStatus(output)
    expect(changes).toEqual([{ status: 'A', path: '.dust/tasks/my-task.md' }])
  })

  test('parses modified files', () => {
    const output = 'M\tsrc/index.ts'
    const changes = parseGitDiffNameStatus(output)
    expect(changes).toEqual([{ status: 'M', path: 'src/index.ts' }])
  })

  test('parses deleted files', () => {
    const output = 'D\t.dust/ideas/old-idea.md'
    const changes = parseGitDiffNameStatus(output)
    expect(changes).toEqual([{ status: 'D', path: '.dust/ideas/old-idea.md' }])
  })

  test('parses renamed files (uses new path)', () => {
    const output = 'R100\told-name.ts\tnew-name.ts'
    const changes = parseGitDiffNameStatus(output)
    expect(changes).toEqual([{ status: 'R', path: 'new-name.ts' }])
  })

  test('parses multiple changes', () => {
    const output = [
      'A\t.dust/tasks/task-1.md',
      'A\t.dust/tasks/task-2.md',
      'D\t.dust/ideas/idea-1.md',
      'M\tsrc/main.ts',
    ].join('\n')
    const changes = parseGitDiffNameStatus(output)
    expect(changes).toEqual([
      { status: 'A', path: '.dust/tasks/task-1.md' },
      { status: 'A', path: '.dust/tasks/task-2.md' },
      { status: 'D', path: '.dust/ideas/idea-1.md' },
      { status: 'M', path: 'src/main.ts' },
    ])
  })

  test('handles empty output', () => {
    const changes = parseGitDiffNameStatus('')
    expect(changes).toEqual([])
  })

  test('handles output with only whitespace', () => {
    const changes = parseGitDiffNameStatus('  \n\n  ')
    expect(changes).toEqual([])
  })

  test('skips malformed lines without tab separator', () => {
    const output = [
      'A\t.dust/tasks/valid-task.md',
      'malformed line without tab',
      'M\tsrc/index.ts',
    ].join('\n')
    const changes = parseGitDiffNameStatus(output)
    expect(changes).toEqual([
      { status: 'A', path: '.dust/tasks/valid-task.md' },
      { status: 'M', path: 'src/index.ts' },
    ])
  })
})

describe('analyzeChangesForTaskOnlyPattern', () => {
  test('identifies task-only commit with single task addition', () => {
    const changes: FileChange[] = [
      { status: 'A', path: '.dust/tasks/my-task.md' },
    ]
    const result = analyzeChangesForTaskOnlyPattern(changes)
    expect(result.isTaskOnly).toBe(true)
    expect(result.taskFiles).toEqual(['.dust/tasks/my-task.md'])
    expect(result.ideaDeletions).toEqual([])
    expect(result.otherChanges).toEqual([])
  })

  test('identifies task-only commit with multiple task additions', () => {
    const changes: FileChange[] = [
      { status: 'A', path: '.dust/tasks/task-1.md' },
      { status: 'A', path: '.dust/tasks/task-2.md' },
    ]
    const result = analyzeChangesForTaskOnlyPattern(changes)
    expect(result.isTaskOnly).toBe(true)
    expect(result.taskFiles).toEqual([
      '.dust/tasks/task-1.md',
      '.dust/tasks/task-2.md',
    ])
  })

  test('identifies task-only commit with task addition and idea deletion', () => {
    const changes: FileChange[] = [
      { status: 'A', path: '.dust/tasks/new-task.md' },
      { status: 'D', path: '.dust/ideas/old-idea.md' },
    ]
    const result = analyzeChangesForTaskOnlyPattern(changes)
    expect(result.isTaskOnly).toBe(true)
    expect(result.taskFiles).toEqual(['.dust/tasks/new-task.md'])
    expect(result.ideaDeletions).toEqual(['.dust/ideas/old-idea.md'])
    expect(result.otherChanges).toEqual([])
  })

  test('identifies task-only commit with multiple tasks and multiple idea deletions', () => {
    const changes: FileChange[] = [
      { status: 'A', path: '.dust/tasks/task-1.md' },
      { status: 'A', path: '.dust/tasks/task-2.md' },
      { status: 'D', path: '.dust/ideas/idea-1.md' },
      { status: 'D', path: '.dust/ideas/idea-2.md' },
    ]
    const result = analyzeChangesForTaskOnlyPattern(changes)
    expect(result.isTaskOnly).toBe(true)
    expect(result.taskFiles).toHaveLength(2)
    expect(result.ideaDeletions).toHaveLength(2)
  })

  test('rejects commit with task addition and other file changes', () => {
    const changes: FileChange[] = [
      { status: 'A', path: '.dust/tasks/my-task.md' },
      { status: 'M', path: 'src/index.ts' },
    ]
    const result = analyzeChangesForTaskOnlyPattern(changes)
    expect(result.isTaskOnly).toBe(false)
    expect(result.taskFiles).toEqual(['.dust/tasks/my-task.md'])
    expect(result.otherChanges).toEqual([{ status: 'M', path: 'src/index.ts' }])
  })

  test('rejects commit with only idea deletions (no task additions)', () => {
    const changes: FileChange[] = [
      { status: 'D', path: '.dust/ideas/old-idea.md' },
    ]
    const result = analyzeChangesForTaskOnlyPattern(changes)
    expect(result.isTaskOnly).toBe(false)
    expect(result.taskFiles).toEqual([])
    expect(result.ideaDeletions).toEqual(['.dust/ideas/old-idea.md'])
  })

  test('rejects commit with task modification (not addition)', () => {
    const changes: FileChange[] = [
      { status: 'M', path: '.dust/tasks/existing-task.md' },
    ]
    const result = analyzeChangesForTaskOnlyPattern(changes)
    expect(result.isTaskOnly).toBe(false)
    expect(result.taskFiles).toEqual([])
    expect(result.otherChanges).toEqual([
      { status: 'M', path: '.dust/tasks/existing-task.md' },
    ])
  })

  test('rejects commit with task deletion', () => {
    const changes: FileChange[] = [
      { status: 'D', path: '.dust/tasks/completed-task.md' },
    ]
    const result = analyzeChangesForTaskOnlyPattern(changes)
    expect(result.isTaskOnly).toBe(false)
    expect(result.taskFiles).toEqual([])
    expect(result.otherChanges).toEqual([
      { status: 'D', path: '.dust/tasks/completed-task.md' },
    ])
  })

  test('rejects commit with idea addition (not deletion)', () => {
    const changes: FileChange[] = [
      { status: 'A', path: '.dust/tasks/new-task.md' },
      { status: 'A', path: '.dust/ideas/new-idea.md' },
    ]
    const result = analyzeChangesForTaskOnlyPattern(changes)
    expect(result.isTaskOnly).toBe(false)
    expect(result.otherChanges).toEqual([
      { status: 'A', path: '.dust/ideas/new-idea.md' },
    ])
  })

  test('handles empty changes array', () => {
    const result = analyzeChangesForTaskOnlyPattern([])
    expect(result.isTaskOnly).toBe(false)
    expect(result.taskFiles).toEqual([])
    expect(result.ideaDeletions).toEqual([])
    expect(result.otherChanges).toEqual([])
  })
})

describe('prePush command', () => {
  describe('uncommitted changes in unattended mode', () => {
    const unattendedEnv = { DUST_UNATTENDED: '1' }

    test('blocks push when uncommitted changes exist in unattended mode', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator()
      const gitRunner = createMockGitRunner({
        'status --porcelain': {
          exitCode: 0,
          output: ' M src/index.ts\n?? new-file.ts\n',
        },
      })

      const result = await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner,
        unattendedEnv
      )

      expect(result.exitCode).toBe(1)
      const output = context.stderrLines.join('\n')
      expect(output).toContain(
        'uncommitted changes detected in unattended mode'
      )
      expect(output).toContain('src/index.ts')
      expect(output).toContain('new-file.ts')
      expect(output).toContain('Commit or discard these changes')
    })

    test('allows push when no uncommitted changes in unattended mode', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': {} },
      })
      fileSystem.readFile = async () =>
        '# Test\n## Goals\n## Blocked by\n## Definition of done'
      const gitRunner = createMockGitRunner({
        'status --porcelain': {
          exitCode: 0,
          output: '',
        },
        'rev-list HEAD --not --remotes': {
          exitCode: 0,
          output: '',
        },
      })

      await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner,
        unattendedEnv
      )

      // Should proceed to check (exitCode depends on check results)
      expect(context.stderrLines.join('\n')).not.toContain(
        'uncommitted changes detected'
      )
    })

    test('allows push with uncommitted changes when NOT in unattended mode', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': {} },
      })
      fileSystem.readFile = async () =>
        '# Test\n## Goals\n## Blocked by\n## Definition of done'
      const gitRunner = createMockGitRunner({
        'rev-list HEAD --not --remotes': {
          exitCode: 0,
          output: '',
        },
      })

      // No DUST_UNATTENDED env var
      await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner,
        {}
      )

      // Should not block (git status not even called)
      expect(context.stderrLines.join('\n')).not.toContain(
        'uncommitted changes detected'
      )
    })

    test('shows all uncommitted files in error message', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator()
      const gitRunner = createMockGitRunner({
        'status --porcelain': {
          exitCode: 0,
          output: [
            ' M lib/modified.ts',
            'A  lib/staged.ts',
            '?? lib/untracked.ts',
            'MM lib/both.ts',
          ].join('\n'),
        },
      })

      const result = await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner,
        unattendedEnv
      )

      expect(result.exitCode).toBe(1)
      const output = context.stderrLines.join('\n')
      expect(output).toContain('lib/modified.ts')
      expect(output).toContain('lib/staged.ts')
      expect(output).toContain('lib/untracked.ts')
      expect(output).toContain('lib/both.ts')
    })

    test('proceeds when git status fails in unattended mode', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': {} },
      })
      fileSystem.readFile = async () =>
        '# Test\n## Goals\n## Blocked by\n## Definition of done'
      const gitRunner = createMockGitRunner({
        'status --porcelain': {
          exitCode: 1,
          output: 'error: not a git repository',
        },
        'rev-list HEAD --not --remotes': {
          exitCode: 0,
          output: '',
        },
      })

      await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner,
        unattendedEnv
      )

      // Should not block (git status failed, assume clean)
      expect(context.stderrLines.join('\n')).not.toContain(
        'uncommitted changes detected'
      )
    })

    test('handles renamed files in uncommitted changes', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator()
      const gitRunner = createMockGitRunner({
        'status --porcelain': {
          exitCode: 0,
          // R = renamed, format is "R  old-name -> new-name"
          output: 'R  src/old.ts -> src/new.ts\n',
        },
      })

      const result = await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner,
        unattendedEnv
      )

      expect(result.exitCode).toBe(1)
      const output = context.stderrLines.join('\n')
      // Should show the new name (destination) of the renamed file
      expect(output).toContain('src/new.ts')
      // Should not show the old name
      expect(output).not.toContain('src/old.ts')
    })

    test('ignores malformed short lines in git status output', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator()
      const gitRunner = createMockGitRunner({
        'status --porcelain': {
          exitCode: 0,
          // Include a valid line and a malformed short line (less than 4 chars)
          output: ' M src/valid.ts\nXY\n?? another.ts\n',
        },
      })

      const result = await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner,
        unattendedEnv
      )

      expect(result.exitCode).toBe(1)
      const output = context.stderrLines.join('\n')
      // Should include the valid files
      expect(output).toContain('src/valid.ts')
      expect(output).toContain('another.ts')
      // The short line "XY" should be ignored (no error)
    })
  })

  describe('task-only detection for Claude Code Web', () => {
    const claudeCodeWebEnv = {
      CLAUDECODE: '1',
      CLAUDE_CODE_ENTRYPOINT: 'remote',
    }

    test('fails with helpful message when only task files are added', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator()
      const gitRunner = createMockGitRunner({
        'rev-list HEAD --not --remotes': {
          exitCode: 0,
          output: 'abc123\n',
        },
        'diff --name-status abc123^..HEAD': {
          exitCode: 0,
          output: 'A\t.dust/tasks/new-feature.md',
        },
      })

      const result = await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner,
        claudeCodeWebEnv
      )

      expect(result.exitCode).toBe(1)
      const output = context.stderrLines.join('\n')
      expect(output).toContain('Task-only commit detected')
      expect(output).toContain('.dust/tasks/new-feature.md')
      expect(output).toContain('bin/dust implement task')
    })

    test('fails with helpful message when task added with idea deletions', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator()
      const gitRunner = createMockGitRunner({
        'rev-list HEAD --not --remotes': {
          exitCode: 0,
          output: 'abc123\n',
        },
        'diff --name-status abc123^..HEAD': {
          exitCode: 0,
          output: [
            'A\t.dust/tasks/new-task.md',
            'D\t.dust/ideas/old-idea.md',
          ].join('\n'),
        },
      })

      const result = await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner,
        claudeCodeWebEnv
      )

      expect(result.exitCode).toBe(1)
      const output = context.stderrLines.join('\n')
      expect(output).toContain('Task-only commit detected')
      expect(output).toContain('.dust/tasks/new-task.md')
      expect(output).toContain('Deleted idea files')
      expect(output).toContain('.dust/ideas/old-idea.md')
    })

    test('shows all task files when multiple tasks are added', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator()
      const gitRunner = createMockGitRunner({
        'rev-list HEAD --not --remotes': {
          exitCode: 0,
          output: 'abc123\n',
        },
        'diff --name-status abc123^..HEAD': {
          exitCode: 0,
          output: [
            'A\t.dust/tasks/task-one.md',
            'A\t.dust/tasks/task-two.md',
          ].join('\n'),
        },
      })

      const result = await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner,
        claudeCodeWebEnv
      )

      expect(result.exitCode).toBe(1)
      const output = context.stderrLines.join('\n')
      expect(output).toContain('.dust/tasks/task-one.md')
      expect(output).toContain('.dust/tasks/task-two.md')
    })
  })

  describe('task-only commits allowed for non-web agents', () => {
    test('allows task-only commits for Claude Code CLI', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': {} },
      })
      fileSystem.readFile = async () =>
        '# Test\n## Goals\n## Blocked by\n## Definition of done'
      const gitRunner = createMockGitRunner({
        'rev-list HEAD --not --remotes': {
          exitCode: 0,
          output: 'abc123\n',
        },
        'diff --name-status abc123^..HEAD': {
          exitCode: 0,
          output: 'A\t.dust/tasks/new-feature.md',
        },
      })

      await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner,
        { CLAUDECODE: '1' }
      )

      expect(context.stderrLines.join('\n')).not.toContain(
        'Task-only commit detected'
      )
    })

    test('allows task-only commits for Codex', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': {} },
      })
      fileSystem.readFile = async () =>
        '# Test\n## Goals\n## Blocked by\n## Definition of done'
      const gitRunner = createMockGitRunner({
        'rev-list HEAD --not --remotes': {
          exitCode: 0,
          output: 'abc123\n',
        },
        'diff --name-status abc123^..HEAD': {
          exitCode: 0,
          output: 'A\t.dust/tasks/new-feature.md',
        },
      })

      await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner,
        { CODEX_HOME: '/home/user/.codex' }
      )

      expect(context.stderrLines.join('\n')).not.toContain(
        'Task-only commit detected'
      )
    })

    test('allows task-only commits for unknown agents', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': {} },
      })
      fileSystem.readFile = async () =>
        '# Test\n## Goals\n## Blocked by\n## Definition of done'
      const gitRunner = createMockGitRunner({
        'rev-list HEAD --not --remotes': {
          exitCode: 0,
          output: 'abc123\n',
        },
        'diff --name-status abc123^..HEAD': {
          exitCode: 0,
          output: 'A\t.dust/tasks/new-feature.md',
        },
      })

      await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner,
        {}
      )

      expect(context.stderrLines.join('\n')).not.toContain(
        'Task-only commit detected'
      )
    })
  })

  describe('normal pushes', () => {
    test('passes when task is added with implementation changes', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': {} },
      })
      fileSystem.readFile = async () =>
        '# Test\n## Goals\n## Blocked by\n## Definition of done'
      const gitRunner = createMockGitRunner({
        'rev-list HEAD --not --remotes': {
          exitCode: 0,
          output: 'abc123\n',
        },
        'diff --name-status abc123^..HEAD': {
          exitCode: 0,
          output: [
            'A\t.dust/tasks/new-feature.md',
            'A\tsrc/feature.ts',
            'M\tsrc/index.ts',
          ].join('\n'),
        },
      })

      // Mock the check command's buffered runner
      await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner
      )

      // Should proceed to check (might fail due to check config, but shouldn't fail on task detection)
      expect(context.stderrLines.join('\n')).not.toContain(
        'Task-only commit detected'
      )
    })

    test('passes when only implementation changes (no task files)', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': {} },
      })
      fileSystem.readFile = async () =>
        '# Test\n## Goals\n## Blocked by\n## Definition of done'
      const gitRunner = createMockGitRunner({
        'rev-list HEAD --not --remotes': {
          exitCode: 0,
          output: 'abc123\n',
        },
        'diff --name-status abc123^..HEAD': {
          exitCode: 0,
          output: ['A\tsrc/new-file.ts', 'M\tsrc/existing.ts'].join('\n'),
        },
      })

      await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner
      )

      expect(context.stderrLines.join('\n')).not.toContain(
        'Task-only commit detected'
      )
    })

    test('passes when task is deleted (completed task)', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': {} },
      })
      fileSystem.readFile = async () =>
        '# Test\n## Goals\n## Blocked by\n## Definition of done'
      const gitRunner = createMockGitRunner({
        'rev-list HEAD --not --remotes': {
          exitCode: 0,
          output: 'abc123\n',
        },
        'diff --name-status abc123^..HEAD': {
          exitCode: 0,
          output: [
            'D\t.dust/tasks/completed-task.md',
            'A\tsrc/implementation.ts',
          ].join('\n'),
        },
      })

      await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner
      )

      expect(context.stderrLines.join('\n')).not.toContain(
        'Task-only commit detected'
      )
    })
  })

  describe('unpushed commit detection', () => {
    test('skips detection when no unpushed commits', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': {} },
      })
      fileSystem.readFile = async () =>
        '# Test\n## Goals\n## Blocked by\n## Definition of done'
      const gitRunner = createMockGitRunner({
        'rev-list HEAD --not --remotes': {
          exitCode: 0,
          output: '',
        },
      })

      await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner
      )

      // Should not show task-only error (proceeds to check)
      expect(context.stderrLines.join('\n')).not.toContain(
        'Task-only commit detected'
      )
    })

    test('skips detection when rev-list command fails', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': {} },
      })
      fileSystem.readFile = async () =>
        '# Test\n## Goals\n## Blocked by\n## Definition of done'
      const gitRunner = createMockGitRunner({
        'rev-list HEAD --not --remotes': {
          exitCode: 1,
          output: '',
        },
      })

      await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner
      )

      // Should not show task-only error (proceeds to check)
      expect(context.stderrLines.join('\n')).not.toContain(
        'Task-only commit detected'
      )
    })

    test('skips detection when git diff fails', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': {} },
      })
      fileSystem.readFile = async () =>
        '# Test\n## Goals\n## Blocked by\n## Definition of done'
      const gitRunner = createMockGitRunner({
        'rev-list HEAD --not --remotes': {
          exitCode: 0,
          output: 'abc123\n',
        },
        'diff --name-status abc123^..HEAD': {
          exitCode: 1,
          output: 'error: unknown revision',
        },
        'diff --name-status 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD': {
          exitCode: 1,
          output: 'error',
        },
      })

      await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner
      )

      // Should not show task-only error (proceeds to check)
      expect(context.stderrLines.join('\n')).not.toContain(
        'Task-only commit detected'
      )
    })

    test('handles multiple unpushed commits correctly (blocks Claude Code Web)', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator()
      const gitRunner = createMockGitRunner({
        'rev-list HEAD --not --remotes': {
          exitCode: 0,
          output: 'commit3\ncommit2\ncommit1\n',
        },
        'diff --name-status commit1^..HEAD': {
          exitCode: 0,
          output: 'A\t.dust/tasks/new-task.md',
        },
      })

      const result = await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner,
        { CLAUDECODE: '1', CLAUDE_CODE_ENTRYPOINT: 'remote' }
      )

      expect(result.exitCode).toBe(1)
      expect(context.stderrLines.join('\n')).toContain(
        'Task-only commit detected'
      )
    })

    test('handles initial commit (no parent) by diffing against empty tree (blocks Claude Code Web)', async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator()
      const gitRunner = createMockGitRunner({
        'rev-list HEAD --not --remotes': {
          exitCode: 0,
          output: 'abc123\n',
        },
        'diff --name-status abc123^..HEAD': {
          exitCode: 1,
          output: "fatal: ambiguous argument 'abc123^': unknown revision",
        },
        'diff --name-status 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD': {
          exitCode: 0,
          output: 'A\t.dust/tasks/new-task.md',
        },
      })

      const result = await prePush(
        createDependencies(context, fileSystem, defaultSettings),
        gitRunner,
        { CLAUDECODE: '1', CLAUDE_CODE_ENTRYPOINT: 'remote' }
      )

      expect(result.exitCode).toBe(1)
      expect(context.stderrLines.join('\n')).toContain(
        'Task-only commit detected'
      )
    })
  })
})

describe('createGitRunner', () => {
  test('captures stdout and stderr', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: InstanceType<typeof EventEmitter>
      stderr: InstanceType<typeof EventEmitter>
    }
    mockProc.stdout = new EventEmitter()
    mockProc.stderr = new EventEmitter()

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createGitRunner(mockSpawn)

    const promise = runner.run(['status'], '/')
    mockProc.stdout.emit('data', Buffer.from('stdout output\n'))
    mockProc.stderr.emit('data', Buffer.from('stderr output\n'))
    mockProc.emit('close', 0)

    const result = await promise
    expect(result.exitCode).toBe(0)
    expect(result.output).toBe('stdout output\nstderr output\n')
  })

  test('resolves with exit code from close event', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: InstanceType<typeof EventEmitter>
      stderr: InstanceType<typeof EventEmitter>
    }
    mockProc.stdout = new EventEmitter()
    mockProc.stderr = new EventEmitter()

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createGitRunner(mockSpawn)

    const promise = runner.run(['status'], '/')
    mockProc.emit('close', 42)

    const result = await promise
    expect(result.exitCode).toBe(42)
  })

  test('resolves with 1 when close event has null code', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: InstanceType<typeof EventEmitter>
      stderr: InstanceType<typeof EventEmitter>
    }
    mockProc.stdout = new EventEmitter()
    mockProc.stderr = new EventEmitter()

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createGitRunner(mockSpawn)

    const promise = runner.run(['status'], '/')
    mockProc.emit('close', null)

    const result = await promise
    expect(result.exitCode).toBe(1)
  })

  test('resolves with 1 on error', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: InstanceType<typeof EventEmitter>
      stderr: InstanceType<typeof EventEmitter>
    }
    mockProc.stdout = new EventEmitter()
    mockProc.stderr = new EventEmitter()

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createGitRunner(mockSpawn)

    const promise = runner.run(['status'], '/')
    mockProc.emit('error', new Error('spawn failed'))

    const result = await promise
    expect(result.exitCode).toBe(1)
    expect(result.output).toBe('spawn failed')
  })

  test('handles null stdout and stderr gracefully', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: null
      stderr: null
    }
    mockProc.stdout = null
    mockProc.stderr = null

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createGitRunner(mockSpawn)

    const promise = runner.run(['status'], '/')
    mockProc.emit('close', 0)

    const result = await promise
    expect(result.exitCode).toBe(0)
    expect(result.output).toBe('')
  })
})

import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
} from '../../test/test-utilities'
import type { DustSettings } from '../types'
import {
  createHealthCheckGitRunner,
  type HealthCheckGitRunner,
  runHealthCheck,
} from './health-check'

function createGitRunnerStub(
  commitsSince: number | null,
  hasGit = true
): HealthCheckGitRunner {
  return {
    commitsSinceLastDeletion: async () => commitsSince,
    hasGitDirectory: () => hasGit,
  }
}

describe('runHealthCheck', () => {
  test('does nothing when no .git directory exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { ideas: {} } },
    })
    const settings: DustSettings = { dustCommand: 'dust' }

    const warned = await runHealthCheck(
      context,
      fileSystem,
      settings,
      createGitRunnerStub(100, false)
    )

    expect(warned).toBe(false)
    expect(context.stderrLines).toHaveLength(0)
  })

  test('does nothing when no .dust directory exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.git': {} },
    })
    const settings: DustSettings = { dustCommand: 'dust' }

    const warned = await runHealthCheck(
      context,
      fileSystem,
      settings,
      createGitRunnerStub(100, true)
    )

    expect(warned).toBe(false)
    expect(context.stderrLines).toHaveLength(0)
  })

  test('does nothing when commits are below threshold', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.git': {}, '.dust': { ideas: {} } },
    })
    const settings: DustSettings = { dustCommand: 'dust' }

    const warned = await runHealthCheck(
      context,
      fileSystem,
      settings,
      createGitRunnerStub(30)
    )

    expect(warned).toBe(false)
    expect(context.stderrLines).toHaveLength(0)
  })

  test('warns when commits exceed default threshold of 50', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.git': {}, '.dust': { ideas: {} } },
    })
    const settings: DustSettings = { dustCommand: 'dust' }

    const warned = await runHealthCheck(
      context,
      fileSystem,
      settings,
      createGitRunnerStub(75)
    )

    expect(warned).toBe(true)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('75 commits since last dust review')
    expect(output).toContain('threshold: 50')
    expect(output).toContain('dust-review.md')
    expect(output).toContain('Repository Hygiene')
    expect(output).toContain('Run `dust lint markdown`')
    expect(output).toContain('Review ideas')
    expect(output).toContain('Verify facts')
    expect(output).toContain('Check goals')
  })

  test('warns when commits exactly meet threshold', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.git': {}, '.dust': { ideas: {} } },
    })
    const settings: DustSettings = { dustCommand: 'dust' }

    const warned = await runHealthCheck(
      context,
      fileSystem,
      settings,
      createGitRunnerStub(50)
    )

    expect(warned).toBe(true)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('50 commits since last dust review')
  })

  test('respects custom threshold from settings', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.git': {}, '.dust': { ideas: {} } },
    })
    const settings: DustSettings = {
      dustCommand: 'dust',
      healthCheckThreshold: 20,
    }

    const warned = await runHealthCheck(
      context,
      fileSystem,
      settings,
      createGitRunnerStub(25)
    )

    expect(warned).toBe(true)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('threshold: 20')
  })

  test('does not warn with custom threshold when below it', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.git': {}, '.dust': { ideas: {} } },
    })
    const settings: DustSettings = {
      dustCommand: 'dust',
      healthCheckThreshold: 100,
    }

    const warned = await runHealthCheck(
      context,
      fileSystem,
      settings,
      createGitRunnerStub(75)
    )

    expect(warned).toBe(false)
    expect(context.stderrLines).toHaveLength(0)
  })

  test('handles null from git runner gracefully', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.git': {}, '.dust': { ideas: {} } },
    })
    const settings: DustSettings = { dustCommand: 'dust' }

    const warned = await runHealthCheck(
      context,
      fileSystem,
      settings,
      createGitRunnerStub(null)
    )

    expect(warned).toBe(false)
    expect(context.stderrLines).toHaveLength(0)
  })
})

function createMockProc(): EventEmitter & {
  stdout: EventEmitter
  stderr: EventEmitter
} {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter
    stderr: EventEmitter
  }
  proc.stdout = new EventEmitter()
  proc.stderr = new EventEmitter()
  return proc
}

describe('createHealthCheckGitRunner', () => {
  test('captures stderr output', async () => {
    let callIndex = 0
    const procs = [createMockProc(), createMockProc()]
    const mockSpawn = () => procs[callIndex++] as unknown as ChildProcess
    const runner = createHealthCheckGitRunner(mockSpawn)

    const promise = runner.commitsSinceLastDeletion('/', 'file.md')

    // First call with stderr
    procs[0].stderr.emit('data', Buffer.from('warning\n'))
    procs[0].stdout.emit('data', Buffer.from('abc123\n'))
    procs[0].emit('close', 0)

    await new Promise(resolve => setTimeout(resolve, 10))

    procs[1].stdout.emit('data', Buffer.from('10\n'))
    procs[1].emit('close', 0)

    expect(await promise).toBe(10)
  })

  test('commitsSinceLastDeletion counts commits since last file deletion', async () => {
    let callIndex = 0
    const procs = [createMockProc(), createMockProc()]
    const mockSpawn = () => procs[callIndex++] as unknown as ChildProcess
    const runner = createHealthCheckGitRunner(mockSpawn)

    const promise = runner.commitsSinceLastDeletion(
      '/',
      '.dust/tasks/dust-review.md'
    )

    // First call: git log --diff-filter=D finds last deletion
    procs[0].stdout.emit('data', Buffer.from('abc123\n'))
    procs[0].emit('close', 0)

    await new Promise(resolve => setTimeout(resolve, 10))

    // Second call: git rev-list --count counts commits since
    procs[1].stdout.emit('data', Buffer.from('25\n'))
    procs[1].emit('close', 0)

    expect(await promise).toBe(25)
  })

  test('commitsSinceLastDeletion counts all commits when file was never deleted', async () => {
    let callIndex = 0
    const procs = [createMockProc(), createMockProc()]
    const mockSpawn = () => procs[callIndex++] as unknown as ChildProcess
    const runner = createHealthCheckGitRunner(mockSpawn)

    const promise = runner.commitsSinceLastDeletion(
      '/',
      '.dust/tasks/dust-review.md'
    )

    // First call: git log --diff-filter=D returns nothing (never deleted)
    procs[0].emit('close', 0)

    await new Promise(resolve => setTimeout(resolve, 10))

    // Second call: git rev-list --count HEAD counts total commits
    procs[1].stdout.emit('data', Buffer.from('100\n'))
    procs[1].emit('close', 0)

    expect(await promise).toBe(100)
  })

  test('commitsSinceLastDeletion returns null when total count fails', async () => {
    let callIndex = 0
    const procs = [createMockProc(), createMockProc()]
    const mockSpawn = () => procs[callIndex++] as unknown as ChildProcess
    const runner = createHealthCheckGitRunner(mockSpawn)

    const promise = runner.commitsSinceLastDeletion(
      '/',
      '.dust/tasks/dust-review.md'
    )

    // First call: no deletion found
    procs[0].emit('close', 0)

    await new Promise(resolve => setTimeout(resolve, 10))

    // Second call: rev-list fails
    procs[1].emit('close', 1)

    expect(await promise).toBeNull()
  })

  test('commitsSinceLastDeletion returns null when rev-list since deletion fails', async () => {
    let callIndex = 0
    const procs = [createMockProc(), createMockProc()]
    const mockSpawn = () => procs[callIndex++] as unknown as ChildProcess
    const runner = createHealthCheckGitRunner(mockSpawn)

    const promise = runner.commitsSinceLastDeletion(
      '/',
      '.dust/tasks/dust-review.md'
    )

    // First call: deletion found
    procs[0].stdout.emit('data', Buffer.from('abc123\n'))
    procs[0].emit('close', 0)

    await new Promise(resolve => setTimeout(resolve, 10))

    // Second call: rev-list fails
    procs[1].emit('close', 1)

    expect(await promise).toBeNull()
  })

  test('commitsSinceLastDeletion returns 0 when total count is non-numeric', async () => {
    let callIndex = 0
    const procs = [createMockProc(), createMockProc()]
    const mockSpawn = () => procs[callIndex++] as unknown as ChildProcess
    const runner = createHealthCheckGitRunner(mockSpawn)

    const promise = runner.commitsSinceLastDeletion('/', 'file.md')

    // First call: no deletion found
    procs[0].emit('close', 0)

    await new Promise(resolve => setTimeout(resolve, 10))

    // Second call: returns non-numeric output
    procs[1].stdout.emit('data', Buffer.from('not a number\n'))
    procs[1].emit('close', 0)

    expect(await promise).toBe(0)
  })

  test('commitsSinceLastDeletion returns 0 when count since deletion is non-numeric', async () => {
    let callIndex = 0
    const procs = [createMockProc(), createMockProc()]
    const mockSpawn = () => procs[callIndex++] as unknown as ChildProcess
    const runner = createHealthCheckGitRunner(mockSpawn)

    const promise = runner.commitsSinceLastDeletion('/', 'file.md')

    // First call: finds deletion hash
    procs[0].stdout.emit('data', Buffer.from('abc123\n'))
    procs[0].emit('close', 0)

    await new Promise(resolve => setTimeout(resolve, 10))

    // Second call: returns non-numeric output
    procs[1].stdout.emit('data', Buffer.from('not a number\n'))
    procs[1].emit('close', 0)

    expect(await promise).toBe(0)
  })

  test('hasGitDirectory checks filesystem for .git', () => {
    const fileSystem = createFileSystemEmulator({
      project: { '.git': {} },
    })
    const runner = createHealthCheckGitRunner(
      () => createMockProc() as unknown as ChildProcess
    )

    expect(runner.hasGitDirectory('/project', fileSystem)).toBe(true)
  })

  test('hasGitDirectory returns false when no .git', () => {
    const fileSystem = createFileSystemEmulator({
      project: {},
    })
    const runner = createHealthCheckGitRunner(
      () => createMockProc() as unknown as ChildProcess
    )

    expect(runner.hasGitDirectory('/project', fileSystem)).toBe(false)
  })

  test('handles error event on process', async () => {
    let callIndex = 0
    const procs = [createMockProc(), createMockProc()]
    const mockSpawn = () => procs[callIndex++] as unknown as ChildProcess
    const runner = createHealthCheckGitRunner(mockSpawn)

    const promise = runner.commitsSinceLastDeletion('/', 'file.md')
    // First call errors — treated as "never deleted"
    procs[0].emit('error', new Error('spawn failed'))

    await new Promise(resolve => setTimeout(resolve, 10))

    // Second call also errors — returns null
    procs[1].emit('error', new Error('spawn failed'))

    expect(await promise).toBeNull()
  })

  test('handles null close code', async () => {
    let callIndex = 0
    const procs = [createMockProc(), createMockProc()]
    const mockSpawn = () => procs[callIndex++] as unknown as ChildProcess
    const runner = createHealthCheckGitRunner(mockSpawn)

    const promise = runner.commitsSinceLastDeletion('/', 'file.md')
    // First call: null code → exitCode 1, empty output → "never deleted"
    procs[0].emit('close', null)

    await new Promise(resolve => setTimeout(resolve, 10))

    // Second call: also null code → returns null
    procs[1].emit('close', null)

    expect(await promise).toBeNull()
  })
})

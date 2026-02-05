import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
} from '../../test/test-utilities'
import type { DustSettings } from '../types'
import { type HealthCheckGitRunner, runHealthCheck } from './health-check'

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

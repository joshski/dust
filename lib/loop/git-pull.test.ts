import { describe, expect, test } from 'vitest'
import type { spawn as nodeSpawn } from 'node:child_process'
import { asTestType, createSpawnEmulator } from '../test-support/test-utilities'
import { gitPull } from './git-pull'

describe('gitPull', () => {
  test('returns success on exit code 0', async () => {
    const { spawn } = createSpawnEmulator({ autoResolve: true })
    const result = await gitPull(
      '/project',
      asTestType<typeof nodeSpawn>(spawn)
    )
    expect(result.success).toBe(true)
  })

  test('returns failure with stderr on non-zero exit', async () => {
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      commands: {
        git: { exitCode: 128, stderr: 'fatal: not a git repository' },
      },
    })
    const result = await gitPull(
      '/project',
      asTestType<typeof nodeSpawn>(spawn)
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.message).toContain('fatal: not a git repository')
    }
  })

  test('returns default message when stderr is empty', async () => {
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      defaultExitCode: 1,
    })
    const result = await gitPull(
      '/project',
      asTestType<typeof nodeSpawn>(spawn)
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.message).toBe('git pull failed')
    }
  })

  test('handles spawn errors', async () => {
    const { spawn } = createSpawnEmulator({
      autoResolve: true,
      commands: {
        git: { error: new Error('spawn ENOENT') },
      },
    })
    const result = await gitPull(
      '/project',
      asTestType<typeof nodeSpawn>(spawn)
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.message).toBe('spawn ENOENT')
    }
  })
})

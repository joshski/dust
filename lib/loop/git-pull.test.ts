import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import { asChildProcessStub } from '../test-support/test-utilities'
import type { LoopDependencies } from './iteration'
import { gitPull } from './git-pull'

function createMockChildProcess(exitCode = 0) {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter | null
    stderr: EventEmitter
  }
  proc.stdout = null
  proc.stderr = new EventEmitter()
  setTimeout(() => proc.emit('close', exitCode), 0)
  return asChildProcessStub(proc)
}

function createMockSpawn(pullExitCode = 0) {
  return (() =>
    createMockChildProcess(pullExitCode)) as LoopDependencies['spawn']
}

describe('gitPull', () => {
  test('returns success on exit code 0', async () => {
    const spawn = createMockSpawn(0)
    const result = await gitPull('/project', spawn)
    expect(result.success).toBe(true)
  })

  test('returns failure with stderr on non-zero exit', async () => {
    const spawn = (() => {
      const proc = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter | null
        stderr: EventEmitter
      }
      proc.stdout = null
      proc.stderr = new EventEmitter()
      setTimeout(() => {
        proc.stderr.emit('data', Buffer.from('fatal: not a git repository'))
        proc.emit('close', 128)
      }, 0)
      return asChildProcessStub(proc)
    }) as LoopDependencies['spawn']
    const result = await gitPull('/project', spawn)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.message).toContain('fatal: not a git repository')
    }
  })

  test('returns default message when stderr is empty', async () => {
    const spawn = createMockSpawn(1)
    const result = await gitPull('/project', spawn)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.message).toBe('git pull failed')
    }
  })

  test('handles spawn errors', async () => {
    const spawn = (() => {
      const proc = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter | null
        stderr: EventEmitter
      }
      proc.stdout = null
      proc.stderr = new EventEmitter()
      setTimeout(() => proc.emit('error', new Error('spawn ENOENT')), 0)
      return asChildProcessStub(proc)
    }) as LoopDependencies['spawn']
    const result = await gitPull('/project', spawn)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.message).toBe('spawn ENOENT')
    }
  })
})

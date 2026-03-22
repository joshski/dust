import { describe, expect, test } from 'vitest'
import { applyMiddleware, type CommandMiddleware } from './middleware'
import type { CommandDependencies, CommandResult } from './types'
import {
  createContextEmulator,
  createFileSystemEmulator,
  createTestRuntimeConfig,
} from '../test/test-utilities'

function createTestDependencies(): CommandDependencies {
  return {
    arguments: [],
    context: createContextEmulator(),
    fileSystem: createFileSystemEmulator(),
    globScanner: createFileSystemEmulator(),
    settings: { dustCommand: 'dust' },
    runtime: createTestRuntimeConfig(),
  }
}

describe('applyMiddleware', () => {
  test('executes command without middleware', async () => {
    const executor = applyMiddleware([], async () => ({ exitCode: 0 }))

    const result = await executor('test', createTestDependencies())

    expect(result.exitCode).toBe(0)
  })

  test('runs before hooks in order', async () => {
    const order: string[] = []

    const middleware1: CommandMiddleware = {
      async before() {
        order.push('before1')
        return undefined
      },
    }
    const middleware2: CommandMiddleware = {
      async before() {
        order.push('before2')
        return undefined
      },
    }

    const executor = applyMiddleware([middleware1, middleware2], async () => {
      order.push('execute')
      return { exitCode: 0 }
    })

    await executor('test', createTestDependencies())

    expect(order).toEqual(['before1', 'before2', 'execute'])
  })

  test('runs after hooks in order', async () => {
    const order: string[] = []

    const middleware1: CommandMiddleware = {
      async after(command, result) {
        order.push('after1')
        return result
      },
    }
    const middleware2: CommandMiddleware = {
      async after(command, result) {
        order.push('after2')
        return result
      },
    }

    const executor = applyMiddleware([middleware1, middleware2], async () => {
      order.push('execute')
      return { exitCode: 0 }
    })

    await executor('test', createTestDependencies())

    expect(order).toEqual(['execute', 'after1', 'after2'])
  })

  test('before hook can short-circuit execution', async () => {
    const order: string[] = []

    const shortCircuitMiddleware: CommandMiddleware = {
      async before() {
        order.push('shortCircuit')
        return { exitCode: 42 }
      },
    }
    const neverReachedMiddleware: CommandMiddleware = {
      async before() {
        order.push('neverReached')
        return undefined
      },
    }

    const executor = applyMiddleware(
      [shortCircuitMiddleware, neverReachedMiddleware],
      async () => {
        order.push('execute')
        return { exitCode: 0 }
      }
    )

    const result = await executor('test', createTestDependencies())

    expect(result.exitCode).toBe(42)
    expect(order).toEqual(['shortCircuit'])
  })

  test('after hooks can transform result', async () => {
    const middleware: CommandMiddleware = {
      async after(command, result) {
        return { exitCode: result.exitCode + 10 }
      },
    }

    const executor = applyMiddleware([middleware], async () => ({
      exitCode: 5,
    }))

    const result = await executor('test', createTestDependencies())

    expect(result.exitCode).toBe(15)
  })

  test('passes command name to middleware', async () => {
    let capturedCommand: string | undefined

    const middleware: CommandMiddleware = {
      async before(command) {
        capturedCommand = command
        return undefined
      },
    }

    const executor = applyMiddleware([middleware], async () => ({
      exitCode: 0,
    }))

    await executor('my-command', createTestDependencies())

    expect(capturedCommand).toBe('my-command')
  })

  test('passes dependencies to before hook', async () => {
    let capturedDependencies: CommandDependencies | undefined

    const middleware: CommandMiddleware = {
      async before(command, dependencies) {
        capturedDependencies = dependencies
        return undefined
      },
    }

    const executor = applyMiddleware([middleware], async () => ({
      exitCode: 0,
    }))
    const testDependencies = createTestDependencies()

    await executor('test', testDependencies)

    expect(capturedDependencies).toBe(testDependencies)
  })

  test('middleware with only before hook works', async () => {
    const middleware: CommandMiddleware = {
      async before() {
        return undefined
      },
    }

    const executor = applyMiddleware([middleware], async () => ({
      exitCode: 0,
    }))

    const result = await executor('test', createTestDependencies())

    expect(result.exitCode).toBe(0)
  })

  test('middleware with only after hook works', async () => {
    const middleware: CommandMiddleware = {
      async after(command, result) {
        return result
      },
    }

    const executor = applyMiddleware([middleware], async () => ({
      exitCode: 0,
    }))

    const result = await executor('test', createTestDependencies())

    expect(result.exitCode).toBe(0)
  })

  test('multiple middlewares compose correctly', async () => {
    const order: string[] = []

    const middleware1: CommandMiddleware = {
      async before() {
        order.push('before1')
        return undefined
      },
      async after(command, result) {
        order.push('after1')
        return result
      },
    }

    const middleware2: CommandMiddleware = {
      async before() {
        order.push('before2')
        return undefined
      },
      async after(command, result) {
        order.push('after2')
        return result
      },
    }

    const executor = applyMiddleware([middleware1, middleware2], async () => {
      order.push('execute')
      return { exitCode: 0 }
    })

    await executor('test', createTestDependencies())

    expect(order).toEqual(['before1', 'before2', 'execute', 'after1', 'after2'])
  })
})

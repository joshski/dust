import { afterEach, describe, expect, test } from 'vitest'
import {
  createDefaultTracingOptions,
  createTracingMiddleware,
  type TracingOptions,
} from './tracing-middleware'
import type { CommandDependencies } from './types'
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

function createTestTracingOptions(
  overrides: Partial<TracingOptions> = {}
): TracingOptions {
  return {
    getTraceId: () => undefined,
    setTraceId: () => {},
    isVerbose: () => false,
    ...overrides,
  }
}

describe('createTracingMiddleware', () => {
  test('sets trace ID if not present', async () => {
    let capturedTraceId: string | undefined

    const middleware = createTracingMiddleware(
      createTestTracingOptions({
        getTraceId: () => undefined,
        setTraceId: traceId => {
          capturedTraceId = traceId
        },
      })
    )
    const dependencies = createTestDependencies()

    await middleware.before!('test', dependencies)

    expect(capturedTraceId).toBeDefined()
    expect(capturedTraceId).toMatch(/^\d+-[a-z0-9]+$/)
  })

  test('preserves existing trace ID', async () => {
    let setTraceIdCalled = false
    const existingTraceId = 'existing-trace-123'

    const middleware = createTracingMiddleware(
      createTestTracingOptions({
        getTraceId: () => existingTraceId,
        setTraceId: () => {
          setTraceIdCalled = true
        },
      })
    )
    const dependencies = createTestDependencies()

    await middleware.before!('test', dependencies)

    expect(setTraceIdCalled).toBe(false)
  })

  test('logs trace ID when verbose mode is enabled', async () => {
    const middleware = createTracingMiddleware(
      createTestTracingOptions({
        isVerbose: () => true,
      })
    )
    const dependencies = createTestDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >

    await middleware.before!('my-command', dependencies)

    expect(context.stderrLines.length).toBe(1)
    expect(context.stderrLines[0]).toMatch(
      /^\[trace:\d+-[a-z0-9]+\] my-command$/
    )
  })

  test('does not log when verbose mode is disabled', async () => {
    const middleware = createTracingMiddleware(
      createTestTracingOptions({
        isVerbose: () => false,
      })
    )
    const dependencies = createTestDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >

    await middleware.before!('test', dependencies)

    expect(context.stderrLines).toHaveLength(0)
  })

  test('returns undefined to continue execution', async () => {
    const middleware = createTracingMiddleware(createTestTracingOptions())
    const dependencies = createTestDependencies()

    const result = await middleware.before!('test', dependencies)

    expect(result).toBeUndefined()
  })
})

describe('createDefaultTracingOptions', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  test('getTraceId returns DUST_TRACE_ID from process.env', () => {
    process.env.DUST_TRACE_ID = 'test-trace-id'
    const options = createDefaultTracingOptions()

    expect(options.getTraceId()).toBe('test-trace-id')
  })

  test('getTraceId returns undefined when DUST_TRACE_ID is not set', () => {
    delete process.env.DUST_TRACE_ID
    const options = createDefaultTracingOptions()

    expect(options.getTraceId()).toBeUndefined()
  })

  test('setTraceId sets DUST_TRACE_ID in process.env', () => {
    const options = createDefaultTracingOptions()

    options.setTraceId('new-trace-id')

    expect(process.env.DUST_TRACE_ID).toBe('new-trace-id')
  })

  test('isVerbose returns true when DUST_VERBOSE is 1', () => {
    process.env.DUST_VERBOSE = '1'
    const options = createDefaultTracingOptions()

    expect(options.isVerbose()).toBe(true)
  })

  test('isVerbose returns false when DUST_VERBOSE is not set', () => {
    delete process.env.DUST_VERBOSE
    const options = createDefaultTracingOptions()

    expect(options.isVerbose()).toBe(false)
  })
})

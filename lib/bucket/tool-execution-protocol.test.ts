import { describe, expect, test } from 'vitest'
import {
  isToolExecutionRequestMessage,
  isToolExecutionResultMessage,
} from './tool-execution-protocol'

describe('isToolExecutionResultMessage', () => {
  test('accepts valid success payloads', () => {
    expect(
      isToolExecutionResultMessage({
        type: 'tool-execution-result',
        requestId: 'req-1',
        result: { type: 'success', data: { url: 'https://example.com' } },
      })
    ).toBe(true)
  })

  test('accepts valid tool-not-found payloads', () => {
    expect(
      isToolExecutionResultMessage({
        type: 'tool-execution-result',
        requestId: 'req-2',
        result: { type: 'tool-not-found', message: 'Unknown tool' },
      })
    ).toBe(true)
  })

  test('accepts valid error payloads', () => {
    expect(
      isToolExecutionResultMessage({
        type: 'tool-execution-result',
        requestId: 'req-3',
        result: { type: 'error', message: 'Something went wrong' },
      })
    ).toBe(true)
  })

  test('rejects null', () => {
    expect(isToolExecutionResultMessage(null)).toBe(false)
  })

  test('rejects empty requestId', () => {
    expect(
      isToolExecutionResultMessage({
        type: 'tool-execution-result',
        requestId: '',
        result: { type: 'success', data: null },
      })
    ).toBe(false)
  })

  test('rejects invalid result type', () => {
    expect(
      isToolExecutionResultMessage({
        type: 'tool-execution-result',
        requestId: 'req-4',
        result: { type: 'unknown' },
      })
    ).toBe(false)
  })

  test('rejects non-object result', () => {
    expect(
      isToolExecutionResultMessage({
        type: 'tool-execution-result',
        requestId: 'req-5',
        result: 'success',
      })
    ).toBe(false)
  })

  test('rejects error result missing message', () => {
    expect(
      isToolExecutionResultMessage({
        type: 'tool-execution-result',
        requestId: 'req-6',
        result: { type: 'error' },
      })
    ).toBe(false)
  })
})

describe('isToolExecutionRequestMessage', () => {
  test('accepts valid request', () => {
    expect(
      isToolExecutionRequestMessage({
        type: 'tool-execution-request',
        requestId: 'req-1',
        tool: 'asset-upload',
        repositoryId: 42,
        arguments: { path: '/tmp/file.png' },
      })
    ).toBe(true)
  })

  test('rejects null', () => {
    expect(isToolExecutionRequestMessage(null)).toBe(false)
  })

  test('rejects empty requestId', () => {
    expect(
      isToolExecutionRequestMessage({
        type: 'tool-execution-request',
        requestId: '',
        tool: 'asset-upload',
        repositoryId: 42,
        arguments: {},
      })
    ).toBe(false)
  })

  test('rejects empty tool', () => {
    expect(
      isToolExecutionRequestMessage({
        type: 'tool-execution-request',
        requestId: 'req-1',
        tool: '',
        repositoryId: 42,
        arguments: {},
      })
    ).toBe(false)
  })

  test('rejects non-numeric repositoryId', () => {
    expect(
      isToolExecutionRequestMessage({
        type: 'tool-execution-request',
        requestId: 'req-1',
        tool: 'asset-upload',
        repositoryId: 'repo-123',
        arguments: {},
      })
    ).toBe(false)
  })

  test('rejects non-object arguments', () => {
    expect(
      isToolExecutionRequestMessage({
        type: 'tool-execution-request',
        requestId: 'req-1',
        tool: 'asset-upload',
        repositoryId: 42,
        arguments: 'not-an-object',
      })
    ).toBe(false)
  })

  test('rejects wrong type field', () => {
    expect(
      isToolExecutionRequestMessage({
        type: 'other-message',
        requestId: 'req-1',
        tool: 'asset-upload',
        repositoryId: 42,
        arguments: {},
      })
    ).toBe(false)
  })
})

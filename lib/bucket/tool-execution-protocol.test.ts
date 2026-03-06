import { describe, expect, test } from 'vitest'
import { isToolExecutionResultMessage } from './tool-execution-protocol'

describe('isToolExecutionResultMessage', () => {
  test('accepts valid success payloads', () => {
    expect(
      isToolExecutionResultMessage({
        type: 'tool-execution-result',
        requestId: 'req-1',
        status: 'success',
        output: 'ok',
      })
    ).toBe(true)
  })

  test('accepts valid tool-not-found payloads', () => {
    expect(
      isToolExecutionResultMessage({
        type: 'tool-execution-result',
        requestId: 'req-2',
        status: 'tool-not-found',
        error: 'Unknown tool',
      })
    ).toBe(true)
  })

  test('rejects invalid payloads', () => {
    expect(isToolExecutionResultMessage(null)).toBe(false)
    expect(
      isToolExecutionResultMessage({
        type: 'tool-execution-result',
        requestId: '',
        status: 'success',
      })
    ).toBe(false)
    expect(
      isToolExecutionResultMessage({
        type: 'tool-execution-result',
        requestId: 'req-3',
        status: 'unknown',
      })
    ).toBe(false)
    expect(
      isToolExecutionResultMessage({
        type: 'tool-execution-result',
        requestId: 'req-4',
        status: 'success',
        output: 123,
      })
    ).toBe(false)
    expect(
      isToolExecutionResultMessage({
        type: 'tool-execution-result',
        requestId: 'req-5',
        status: 'error',
        error: 456,
      })
    ).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import { createErrnoError } from '../test-support/test-utilities'
import { isErrnoException, isErrorCode } from './error-codes'

describe('isErrnoException', () => {
  it('returns true for error with string code property', () => {
    const error = { code: 'ENOENT' }
    expect(isErrnoException(error)).toBe(true)
  })

  it('returns true for Error with string code property', () => {
    const error = createErrnoError('ENOENT', 'File not found')
    expect(isErrnoException(error)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isErrnoException(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isErrnoException(undefined)).toBe(false)
  })

  it('returns false for string', () => {
    expect(isErrnoException('error')).toBe(false)
  })

  it('returns false for number', () => {
    expect(isErrnoException(42)).toBe(false)
  })

  it('returns false for boolean', () => {
    expect(isErrnoException(true)).toBe(false)
  })

  it('returns false for object without code property', () => {
    const error = { message: 'Something went wrong' }
    expect(isErrnoException(error)).toBe(false)
  })

  it('returns false for object with non-string code property', () => {
    const error = { code: 42 }
    expect(isErrnoException(error)).toBe(false)
  })

  it('returns false for array', () => {
    expect(isErrnoException([])).toBe(false)
  })

  it('returns false for array with code property', () => {
    const array = ['error'] as unknown
    ;(array as { code: string }).code = 'ENOENT'
    expect(isErrnoException(array)).toBe(true)
  })
})

describe('isErrorCode', () => {
  it('returns true when error has matching code', () => {
    const error = { code: 'ENOENT' }
    expect(isErrorCode(error, 'ENOENT')).toBe(true)
  })

  it('returns true for Error with matching code', () => {
    const error = createErrnoError('ENOENT', 'File not found')
    expect(isErrorCode(error, 'ENOENT')).toBe(true)
  })

  it('returns false when error has different code', () => {
    const error = { code: 'ENOENT' }
    expect(isErrorCode(error, 'EEXIST')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isErrorCode(null, 'ENOENT')).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isErrorCode(undefined, 'ENOENT')).toBe(false)
  })

  it('returns false for string', () => {
    expect(isErrorCode('error', 'ENOENT')).toBe(false)
  })

  it('returns false for number', () => {
    expect(isErrorCode(42, 'ENOENT')).toBe(false)
  })

  it('returns false for boolean', () => {
    expect(isErrorCode(true, 'ENOENT')).toBe(false)
  })

  it('returns false for object without code property', () => {
    const error = { message: 'Something went wrong' }
    expect(isErrorCode(error, 'ENOENT')).toBe(false)
  })

  it('returns false for object with non-string code property', () => {
    const error = { code: 42 }
    expect(isErrorCode(error, 'ENOENT')).toBe(false)
  })

  it('handles EEXIST code', () => {
    const error = { code: 'EEXIST' }
    expect(isErrorCode(error, 'EEXIST')).toBe(true)
    expect(isErrorCode(error, 'ENOENT')).toBe(false)
  })

  it('is case sensitive', () => {
    const error = { code: 'ENOENT' }
    expect(isErrorCode(error, 'enoent')).toBe(false)
  })

  it('handles empty string code', () => {
    const error = { code: '' }
    expect(isErrorCode(error, '')).toBe(true)
    expect(isErrorCode(error, 'ENOENT')).toBe(false)
  })
})

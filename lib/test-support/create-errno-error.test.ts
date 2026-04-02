import { describe, expect, test } from 'vitest'
import { createErrnoError } from './test-utilities'

describe('createErrnoError', () => {
  test('creates error with specified code', () => {
    const error = createErrnoError('ENOENT')
    expect(error.code).toBe('ENOENT')
  })

  test('creates error with default message format', () => {
    const error = createErrnoError('ENOENT')
    expect(error.message).toBe('ENOENT: error')
  })

  test('creates error with custom message', () => {
    const error = createErrnoError('ENOENT', 'ENOENT: no such file')
    expect(error.message).toBe('ENOENT: no such file')
  })

  test('returns properly typed NodeJS.ErrnoException', () => {
    const error = createErrnoError('EACCES')
    // Type assertion - if this compiles, the type is correct
    const typedError: NodeJS.ErrnoException = error
    expect(typedError).toBe(error)
  })

  test('creates different error codes', () => {
    const enoentError = createErrnoError('ENOENT')
    const eexistError = createErrnoError('EEXIST')
    const eaccesError = createErrnoError('EACCES')

    expect(enoentError.code).toBe('ENOENT')
    expect(eexistError.code).toBe('EEXIST')
    expect(eaccesError.code).toBe('EACCES')
  })

  test('error is instanceof Error', () => {
    const error = createErrnoError('ENOENT')
    expect(error).toBeInstanceOf(Error)
  })
})

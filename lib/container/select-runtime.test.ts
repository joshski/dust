import { describe, expect, test } from 'vitest'
import { selectContainerRuntime } from './select-runtime'

describe('selectContainerRuntime', () => {
  test('returns error when both flags are set', () => {
    const result = selectContainerRuntime({
      docker: true,
      appleContainer: true,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe(
        'Cannot use both --docker and --apple-container. Choose one container runtime.'
      )
    }
  })

  test('returns docker runtime when --docker flag is set', () => {
    const result = selectContainerRuntime({
      docker: true,
      appleContainer: false,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.runtime?.name).toBe('docker')
      expect(result.forceContainer).toBe(true)
    }
  })

  test('returns apple-container runtime when --apple-container flag is set', () => {
    const result = selectContainerRuntime({
      docker: false,
      appleContainer: true,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.runtime?.name).toBe('apple-container')
      expect(result.forceContainer).toBe(true)
    }
  })

  test('returns null runtime when no flags are set', () => {
    const result = selectContainerRuntime({
      docker: false,
      appleContainer: false,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.runtime).toBeNull()
      expect(result.forceContainer).toBe(false)
    }
  })
})

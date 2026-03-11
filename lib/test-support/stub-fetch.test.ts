import { describe, expect, test } from 'vitest'
import { stubFetch } from './stub-fetch'

describe('stubFetch', () => {
  test('replaces fetch for the duration of an async callback', async () => {
    const original = globalThis.fetch
    const result = await stubFetch(
      async () => new Response('stubbed'),
      async () => {
        const response = await fetch('http://example.com')
        return response.text()
      }
    )
    expect(result).toBe('stubbed')
    expect(globalThis.fetch).toBe(original)
  })

  test('replaces fetch for the duration of a sync callback', () => {
    const original = globalThis.fetch
    const result = stubFetch(
      async () => new Response('stubbed'),
      () => 42
    )
    expect(result).toBe(42)
    expect(globalThis.fetch).toBe(original)
  })

  test('restores fetch when async callback rejects', async () => {
    const original = globalThis.fetch
    await expect(
      stubFetch(
        async () => new Response('stubbed'),
        async () => {
          throw new Error('boom')
        }
      )
    ).rejects.toThrow('boom')
    expect(globalThis.fetch).toBe(original)
  })

  test('restores fetch when sync callback throws', () => {
    const original = globalThis.fetch
    expect(() =>
      stubFetch(
        async () => new Response('stubbed'),
        () => {
          throw new Error('sync boom')
        }
      )
    ).toThrow('sync boom')
    expect(globalThis.fetch).toBe(original)
  })
})

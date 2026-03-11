type FetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

/**
 * Stub globalThis.fetch for the duration of a callback.
 * Automatically restores the original fetch when the callback completes
 * (works with both sync and async callbacks).
 */
export function stubFetch<T>(
  fake: FetchFn,
  callback: () => T | Promise<T>
): T | Promise<T> {
  const original = globalThis.fetch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.fetch = fake as any
  const restore = () => {
    globalThis.fetch = original
  }

  try {
    const result = callback()
    if (
      result !== null &&
      result !== undefined &&
      typeof (result as PromiseLike<T>).then === 'function'
    ) {
      return Promise.resolve(result).finally(restore)
    }
    restore()
    return result
  } catch (error) {
    restore()
    throw error
  }
}

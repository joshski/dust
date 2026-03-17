/**
 * In-memory time emulator for deterministic testing of time-dependent behavior.
 *
 * Provides controllable setTimeout/setInterval implementations that can be
 * advanced programmatically via advance(ms), enabling tests to avoid fixed
 * delays while verifying time-based logic.
 */

type TimeoutCallback = () => void

interface ScheduledTimer {
  callback: TimeoutCallback
  triggerTime: number
  interval: number | null
  id: number
}

/**
 * Time emulator for deterministic control over timer-based code.
 */
export interface TimeEmulator {
  /** Create a one-shot timeout, returns an ID for clearing. */
  createTimeout: (callback: TimeoutCallback, ms: number) => unknown
  /** Clear a timeout by ID. */
  clearTimeout: (id: unknown) => void
  /** Create a repeating interval, returns an ID for clearing. */
  createInterval: (callback: TimeoutCallback, ms: number) => unknown
  /** Clear an interval by ID. */
  clearInterval: (id: unknown) => void
  /** Advance time by the specified milliseconds, firing due timers. */
  advance: (ms: number) => void
  /** Current virtual time in milliseconds. */
  now: () => number
}

/**
 * Creates a time emulator with controllable timer functions.
 *
 * The emulator starts at time 0. Use advance(ms) to move time forward,
 * which fires any timers scheduled to trigger during that period.
 *
 * @example
 * const time = createTimeEmulator()
 * let fired = false
 * time.createTimeout(() => { fired = true }, 100)
 *
 * time.advance(50)
 * expect(fired).toBe(false)
 *
 * time.advance(50)
 * expect(fired).toBe(true)
 */
export function createTimeEmulator(): TimeEmulator {
  let currentTime = 0
  let nextId = 1
  const timers = new Map<number, ScheduledTimer>()

  const createTimeout = (callback: TimeoutCallback, ms: number): unknown => {
    const id = nextId++
    timers.set(id, {
      callback,
      triggerTime: currentTime + ms,
      interval: null,
      id,
    })
    return id
  }

  const clearTimeout = (id: unknown): void => {
    if (typeof id === 'number') {
      timers.delete(id)
    }
  }

  const createInterval = (callback: TimeoutCallback, ms: number): unknown => {
    const id = nextId++
    timers.set(id, {
      callback,
      triggerTime: currentTime + ms,
      interval: ms,
      id,
    })
    return id
  }

  const clearInterval = (id: unknown): void => {
    if (typeof id === 'number') {
      timers.delete(id)
    }
  }

  const advance = (ms: number): void => {
    const targetTime = currentTime + ms

    // Process timers in order until we reach target time
    while (currentTime < targetTime) {
      // Find the next timer to fire
      let nextTimer: ScheduledTimer | null = null
      for (const timer of timers.values()) {
        if (
          timer.triggerTime <= targetTime &&
          (!nextTimer || timer.triggerTime < nextTimer.triggerTime)
        ) {
          nextTimer = timer
        }
      }

      if (!nextTimer || nextTimer.triggerTime > targetTime) {
        // No more timers to fire before target time
        currentTime = targetTime
        break
      }

      // Advance to the timer's trigger time and fire it
      currentTime = nextTimer.triggerTime
      const callback = nextTimer.callback

      if (nextTimer.interval !== null) {
        // Reschedule interval timer
        nextTimer.triggerTime = currentTime + nextTimer.interval
      } else {
        // Remove one-shot timeout
        timers.delete(nextTimer.id)
      }

      // Fire the callback after updating timer state
      callback()
    }
  }

  return {
    createTimeout,
    clearTimeout,
    createInterval,
    clearInterval,
    advance,
    now: () => currentTime,
  }
}

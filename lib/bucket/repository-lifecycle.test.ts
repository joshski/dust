import { describe, expect, test } from 'vitest'
import {
  transition,
  type LifecycleAction,
  type RepositoryLifecycleState,
  type TransitionResult,
} from './repository-lifecycle'

function createMockLoopPromise(): Promise<void> {
  return Promise.resolve()
}

function createMockCancel(): () => void {
  return () => {}
}

describe('transition', () => {
  describe('start action', () => {
    test('idle -> starting on start', () => {
      const current: RepositoryLifecycleState = { type: 'idle' }
      const action: LifecycleAction = { type: 'start' }

      const result: TransitionResult = transition(current, action)

      expect(result).toEqual({ ok: true, state: { type: 'starting' } })
    })

    test('cannot start from starting', () => {
      const current: RepositoryLifecycleState = { type: 'starting' }
      const action: LifecycleAction = { type: 'start' }

      const result = transition(current, action)

      expect(result).toEqual({
        ok: false,
        error: "Cannot start from state 'starting'",
      })
    })

    test('cannot start from running', () => {
      const current: RepositoryLifecycleState = {
        type: 'running',
        loopPromise: createMockLoopPromise(),
        cancel: createMockCancel(),
      }
      const action: LifecycleAction = { type: 'start' }

      const result = transition(current, action)

      expect(result).toEqual({
        ok: false,
        error: "Cannot start from state 'running'",
      })
    })

    test('cannot start from stopping', () => {
      const current: RepositoryLifecycleState = { type: 'stopping' }
      const action: LifecycleAction = { type: 'start' }

      const result = transition(current, action)

      expect(result).toEqual({
        ok: false,
        error: "Cannot start from state 'stopping'",
      })
    })

    test('cannot start from stopped', () => {
      const current: RepositoryLifecycleState = { type: 'stopped' }
      const action: LifecycleAction = { type: 'start' }

      const result = transition(current, action)

      expect(result).toEqual({
        ok: false,
        error: "Cannot start from state 'stopped'",
      })
    })
  })

  describe('started action', () => {
    test('starting -> running on started', () => {
      const current: RepositoryLifecycleState = { type: 'starting' }
      const loopPromise = createMockLoopPromise()
      const cancel = createMockCancel()
      const action: LifecycleAction = { type: 'started', loopPromise, cancel }

      const result = transition(current, action)

      expect(result).toEqual({
        ok: true,
        state: { type: 'running', loopPromise, cancel },
      })
    })

    test('cannot mark started from idle', () => {
      const current: RepositoryLifecycleState = { type: 'idle' }
      const action: LifecycleAction = {
        type: 'started',
        loopPromise: createMockLoopPromise(),
        cancel: createMockCancel(),
      }

      const result = transition(current, action)

      expect(result).toEqual({
        ok: false,
        error: "Cannot mark started from state 'idle'",
      })
    })

    test('cannot mark started from running', () => {
      const current: RepositoryLifecycleState = {
        type: 'running',
        loopPromise: createMockLoopPromise(),
        cancel: createMockCancel(),
      }
      const action: LifecycleAction = {
        type: 'started',
        loopPromise: createMockLoopPromise(),
        cancel: createMockCancel(),
      }

      const result = transition(current, action)

      expect(result).toEqual({
        ok: false,
        error: "Cannot mark started from state 'running'",
      })
    })

    test('cannot mark started from stopping', () => {
      const current: RepositoryLifecycleState = { type: 'stopping' }
      const action: LifecycleAction = {
        type: 'started',
        loopPromise: createMockLoopPromise(),
        cancel: createMockCancel(),
      }

      const result = transition(current, action)

      expect(result).toEqual({
        ok: false,
        error: "Cannot mark started from state 'stopping'",
      })
    })

    test('cannot mark started from stopped', () => {
      const current: RepositoryLifecycleState = { type: 'stopped' }
      const action: LifecycleAction = {
        type: 'started',
        loopPromise: createMockLoopPromise(),
        cancel: createMockCancel(),
      }

      const result = transition(current, action)

      expect(result).toEqual({
        ok: false,
        error: "Cannot mark started from state 'stopped'",
      })
    })
  })

  describe('stop action', () => {
    test('running -> stopping on stop', () => {
      const current: RepositoryLifecycleState = {
        type: 'running',
        loopPromise: createMockLoopPromise(),
        cancel: createMockCancel(),
      }
      const action: LifecycleAction = { type: 'stop' }

      const result = transition(current, action)

      expect(result).toEqual({ ok: true, state: { type: 'stopping' } })
    })

    test('starting -> idle on stop', () => {
      const current: RepositoryLifecycleState = { type: 'starting' }
      const action: LifecycleAction = { type: 'stop' }

      const result = transition(current, action)

      expect(result).toEqual({ ok: true, state: { type: 'idle' } })
    })

    test('stopping -> idle on stop', () => {
      const current: RepositoryLifecycleState = { type: 'stopping' }
      const action: LifecycleAction = { type: 'stop' }

      const result = transition(current, action)

      expect(result).toEqual({ ok: true, state: { type: 'idle' } })
    })

    test('stopped -> idle on stop', () => {
      const current: RepositoryLifecycleState = { type: 'stopped' }
      const action: LifecycleAction = { type: 'stop' }

      const result = transition(current, action)

      expect(result).toEqual({ ok: true, state: { type: 'idle' } })
    })

    test('cannot stop from idle', () => {
      const current: RepositoryLifecycleState = { type: 'idle' }
      const action: LifecycleAction = { type: 'stop' }

      const result = transition(current, action)

      expect(result).toEqual({
        ok: false,
        error: "Cannot stop from state 'idle'",
      })
    })
  })

  describe('stopped action', () => {
    test('stopping -> stopped on stopped', () => {
      const current: RepositoryLifecycleState = { type: 'stopping' }
      const action: LifecycleAction = { type: 'stopped' }

      const result = transition(current, action)

      expect(result).toEqual({ ok: true, state: { type: 'stopped' } })
    })

    test('cannot mark stopped from idle', () => {
      const current: RepositoryLifecycleState = { type: 'idle' }
      const action: LifecycleAction = { type: 'stopped' }

      const result = transition(current, action)

      expect(result).toEqual({
        ok: false,
        error: "Cannot mark stopped from state 'idle'",
      })
    })

    test('cannot mark stopped from starting', () => {
      const current: RepositoryLifecycleState = { type: 'starting' }
      const action: LifecycleAction = { type: 'stopped' }

      const result = transition(current, action)

      expect(result).toEqual({
        ok: false,
        error: "Cannot mark stopped from state 'starting'",
      })
    })

    test('cannot mark stopped from running', () => {
      const current: RepositoryLifecycleState = {
        type: 'running',
        loopPromise: createMockLoopPromise(),
        cancel: createMockCancel(),
      }
      const action: LifecycleAction = { type: 'stopped' }

      const result = transition(current, action)

      expect(result).toEqual({
        ok: false,
        error: "Cannot mark stopped from state 'running'",
      })
    })

    test('cannot mark stopped from stopped', () => {
      const current: RepositoryLifecycleState = { type: 'stopped' }
      const action: LifecycleAction = { type: 'stopped' }

      const result = transition(current, action)

      expect(result).toEqual({
        ok: false,
        error: "Cannot mark stopped from state 'stopped'",
      })
    })
  })

  describe('full lifecycle sequence', () => {
    test('idle -> starting -> running -> stopping -> stopped', () => {
      const loopPromise = createMockLoopPromise()
      const cancel = createMockCancel()

      let state: RepositoryLifecycleState = { type: 'idle' }

      const startResult = transition(state, { type: 'start' })
      expect(startResult.ok).toBe(true)
      if (startResult.ok) state = startResult.state

      const startedResult = transition(state, {
        type: 'started',
        loopPromise,
        cancel,
      })
      expect(startedResult.ok).toBe(true)
      if (startedResult.ok) state = startedResult.state

      const stopResult = transition(state, { type: 'stop' })
      expect(stopResult.ok).toBe(true)
      if (stopResult.ok) state = stopResult.state

      const stoppedResult = transition(state, { type: 'stopped' })
      expect(stoppedResult.ok).toBe(true)
      if (stoppedResult.ok) state = stoppedResult.state

      expect(state).toEqual({ type: 'stopped' })
    })
  })
})

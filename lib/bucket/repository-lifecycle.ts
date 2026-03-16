/**
 * Repository lifecycle state type for dust bucket.
 *
 * Represents all valid states in the repository lifecycle as a discriminated union,
 * making invalid state combinations unrepresentable.
 */

export type RepositoryLifecycleState =
  | { type: 'idle' }
  | { type: 'starting' }
  | { type: 'running'; loopPromise: Promise<void>; cancel: () => void }
  | { type: 'stopping' }
  | { type: 'stopped' }

export type LifecycleAction =
  | { type: 'start' }
  | { type: 'started'; loopPromise: Promise<void>; cancel: () => void }
  | { type: 'stop' }
  | { type: 'stopped' }

export type TransitionResult =
  | { ok: true; state: RepositoryLifecycleState }
  | { ok: false; error: string }

export function transition(
  current: RepositoryLifecycleState,
  action: LifecycleAction
): TransitionResult {
  switch (action.type) {
    case 'start':
      if (current.type === 'idle') {
        return { ok: true, state: { type: 'starting' } }
      }
      return { ok: false, error: `Cannot start from state '${current.type}'` }

    case 'started':
      if (current.type === 'starting') {
        return {
          ok: true,
          state: {
            type: 'running',
            loopPromise: action.loopPromise,
            cancel: action.cancel,
          },
        }
      }
      return {
        ok: false,
        error: `Cannot mark started from state '${current.type}'`,
      }

    case 'stop':
      if (current.type === 'running') {
        return { ok: true, state: { type: 'stopping' } }
      }
      if (current.type === 'starting' || current.type === 'stopping') {
        return { ok: true, state: { type: 'idle' } }
      }
      if (current.type === 'stopped') {
        return { ok: true, state: { type: 'idle' } }
      }
      return { ok: false, error: `Cannot stop from state '${current.type}'` }

    case 'stopped':
      if (current.type === 'stopping') {
        return { ok: true, state: { type: 'stopped' } }
      }
      return {
        ok: false,
        error: `Cannot mark stopped from state '${current.type}'`,
      }
  }
}

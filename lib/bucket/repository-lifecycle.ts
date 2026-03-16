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

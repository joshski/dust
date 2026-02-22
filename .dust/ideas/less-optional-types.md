# Less Optional Types

The codebase has several types where properties are marked optional but are always present in practice. This creates unnecessary uncertainty for consumers and requires defensive coding patterns that clutter the codebase.

## Current State

### CheckResult - Always-Present Optional Fields

In `lib/cli/commands/check.ts:39-49`, the `CheckResult` interface marks several fields as optional:

```typescript
interface CheckResult {
  name: string
  command: string
  exitCode: number
  output: string
  isBuiltIn?: boolean
  hints?: string[]
  durationMs?: number
  timedOut?: boolean
  timeoutSeconds?: number
}
```

However, in `runSingleCheck` (lines 67-76), `durationMs`, `timedOut`, and `timeoutSeconds` are always assigned. The optionality forces consumers to handle `undefined` cases that cannot occur.

### Repository Interface Inconsistency

In `lib/bucket/repository.ts:45-50`, the `Repository` interface has optional `id`:

```typescript
export interface Repository {
  name: string
  gitUrl: string
  url?: string
  id?: number
}
```

But `RepositoryListItem` in `lib/bucket/server-messages.ts` extends `Repository` and makes `id` required. This creates an inconsistency: if a repository comes from the server, it always has an `id`, but the base type doesn't reflect this.

### RepositoryState - Lifecycle-Dependent Fields

In `lib/bucket/repository.ts:52-62`:

```typescript
export interface RepositoryState {
  repository: Repository
  path: string
  loopPromise: Promise<void> | null
  stopRequested: boolean
  logBuffer: LogBuffer
  agentStatus: 'idle' | 'busy'
  wakeUp?: () => void
  taskAvailablePending?: boolean
  cancelCurrentIteration?: () => void
}
```

Fields like `wakeUp` and `cancelCurrentIteration` are set to `undefined` when the loop is not running, then populated during operation. These are correctly optional because they represent lifecycle state.

### IterationOptions - Defaults vs Optionality

In `lib/cli/commands/loop.ts`, `IterationOptions` marks `hooksInstalled` and `logger` as optional, but they're immediately given defaults. This is acceptable—optional parameters with defaults is idiomatic TypeScript. However, if callers always provide these values in practice, making them required would better document the actual API.

## Impact

Unnecessary optionality:

1. **Requires defensive coding** - Consumers must check for `undefined` even when values are guaranteed present
2. **Obscures API contracts** - The type doesn't communicate what's actually guaranteed
3. **Hinders refactoring** - TypeScript can't catch missing assignments when optionality is overly broad

## Relationship to Existing Ideas

This idea is a specific subset of [Increase Type Safety](increase-type-safety.md), which covers broader typing concerns like tool input typing and error handling assertions. This idea focuses specifically on reducing unnecessary optionality.

## Open Questions

### How should lifecycle-dependent fields be typed?

#### Use distinct types for each state

Define `IdleRepositoryState` and `ActiveRepositoryState` with appropriate required fields. Use a discriminated union based on a status field like `agentStatus`. This makes the type system accurately reflect state transitions (e.g., `wakeUp` is only present when a loop is running), but adds complexity and requires refactoring existing code.

#### Keep optional fields with documented invariants

Keep the current approach where optional fields are set/unset during operation. Document in comments when each field is guaranteed present. This is simpler but relies on convention rather than type enforcement.

### How should related types with different guarantees be structured?

#### Create separate types for each context

Define `Repository` (from Git URL parsing, no id) and `ServerRepository` (from server, has id). Types that work with server data use `ServerRepository`. This accurately reflects the data sources but adds type proliferation.

#### Make commonly-present fields required in the base type

Make `id` required in `Repository`. Call sites that don't have an id would need to provide a sentinel value or use a different type. This simplifies consuming code but may not fit all use cases.

# Export Task Type

Export the `Task` type from `@joshski/dust/types` so consumers can import it directly without reaching into `@joshski/dust/artifacts`.

## Why

Downstream projects that want to work with task data (e.g., rendering task lists or graphs) currently have no public type export for `Task`. The type exists in `lib/artifacts/tasks.ts` and is used internally, but consumers must either re-define it or import from an internal path.

## Principles

- [Decoupled Code](../principles/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- [ ] `Task` type is exported from `lib/types.ts`
- [ ] Consumers can `import type { Task } from '@joshski/dust/types'`
- [ ] Package exports fact is updated if needed

# Export Repository Type

Export the `Repository` interface via `@joshski/dust/types` for consumers building dustbucket servers or alternative bucket implementations.

## Background

The `Repository` interface at `lib/bucket/repository.ts:45-50` defines repository metadata (name, gitUrl, url, id) but is not exported from the public package API. Alternative dustbucket implementations must discover this contract by reading source code.

## Implementation

1. Add `Repository` export to `lib/types.ts`
2. Re-export from `lib/bucket/repository.ts` (already exported, just not from public entry point)
3. Update `package-exports.md` fact to document the new export

## Principles

- [Decoupled Code](../principles/decoupled-code.md)
- [Traceable Decisions](../principles/traceable-decisions.md)

## Blocked By

(none)

## Definition of Done

- [ ] `Repository` type is importable via `import type { Repository } from "@joshski/dust/types"`
- [ ] TypeScript compilation succeeds
- [ ] `package-exports.md` fact documents the `Repository` export
- [ ] All checks pass (`bin/dust check`)

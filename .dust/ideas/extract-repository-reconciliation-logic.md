# Extract repository reconciliation logic

The `handleRepositoryList()` function combines parsing, domain decision logic, and orchestration.

## Location

`lib/bucket/repository.ts:387-427` — `handleRepositoryList()`

## Responsibility Split

The function currently mixes three distinct responsibilities:

1. **Parsing** — Iterates `unknown[]` and calls `parseRepository()` to build a `Map<string, Repository>`
2. **Domain decision logic** — Compares existing repositories against incoming ones to determine add/remove/update operations, including branch change detection and agent provider comparison
3. **Cross-module orchestration** — Sequentially calls `addRepository()`, `removeRepositoryFromManager()`, and mutates repository state for agent provider changes

## Severity

Medium-high — The function is testable via integration tests, but unit testing the reconciliation logic in isolation requires mocking async filesystem operations. Extracting the decision logic would enable pure function testing.

## Suggested Extraction Plan

1. **Extract `computeRepositoryReconciliation()`** — A pure function taking `existingRepos: Map<string, Repository>` and `incomingRepos: Map<string, Repository>` that returns a list of reconciliation actions:
   ```typescript
   type ReconciliationAction =
     | { type: 'add'; repository: Repository }
     | { type: 'remove'; name: string }
     | { type: 'reclone'; name: string; repository: Repository; reason: string }
     | { type: 'updateProvider'; name: string; newProvider: string | undefined }
   ```

2. **Extract `parseRepositoryList()`** — A pure function taking `unknown[]` and returning `Map<string, Repository>` by mapping `parseRepository()` over the input.

3. **Keep `handleRepositoryList()` as thin orchestrator** — Calls `parseRepositoryList()`, then `computeRepositoryReconciliation()`, then applies each action by calling the appropriate side-effecting functions.

This preserves the Functional Core, Imperative Shell boundary by moving the decision logic into pure functions while keeping IO coordination in the shell.

## Related Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Design for Testability](../principles/design-for-testability.md)

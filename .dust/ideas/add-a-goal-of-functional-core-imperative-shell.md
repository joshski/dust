# Add a goal of "Functional Core, Imperative Shell"

Introduce a goal that explicitly names the [Functional Core, Imperative Shell](https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell) pattern as a design target for the codebase. The pattern separates code into a pure, testable "functional core" (values in, values out, no side effects) and a thin "imperative shell" that handles I/O and wires things together.

## Codebase Context

The codebase already exhibits strong movement towards this pattern:

- **`wire.ts` / `run.ts` split** — `run.ts` is a thin imperative shell that passes real Node.js APIs into `wire.ts`, which constructs dependencies and calls `main()`. This is a textbook example.
- **`CommandDependencies` interface** — All commands receive injected `fileSystem`, `globScanner`, `stdout`/`stderr` callbacks rather than calling global APIs directly.
- **Pure domain logic** — `workflow-tasks.ts`, `next.ts` (`extractBlockedBy`, `findUnblockedTasks`), `markdown-utilities.ts`, and `formatLoopEvent` are pure transformations.
- **`process-runner.ts`** — The `createShellRunner` / `createGitRunner` factory pattern separates "what to run" from "how to run it" via injected `SpawnFn`.

However, several areas still mix pure logic with side effects:

- **`loop.ts`** — `runOneIteration()` interleaves business decisions with process orchestration, and `getEnvironmentContext()` calls `os.hostname()`, `crypto.randomUUID()`, `readFileSync` directly.
- **`loadSettings`** — Reads `process.env` directly rather than accepting environment as a parameter.
- **`bucket.ts`** — WebSocket handling, process orchestration, UI, and business logic in one file.

## Relationship to Existing Goals

This pattern is already implied by several existing goals but never named explicitly:

- [Decoupled Code](../goals/decoupled-code.md) — "Dependencies are passed in rather than hard-coded"
- [Dependency Injection](../goals/dependency-injection.md) — The `CommandDependencies` interface is the primary mechanism
- [Test Isolation](../goals/test-isolation.md) / [Environment Independent Tests](../goals/environment-independent-tests.md) — Require separating pure logic from I/O

The new goal would give a name to the overarching pattern that unifies these existing goals.

## Related Ideas

- [Consolidate Process Runner Patterns](consolidate-process-runner-patterns.md) — Duplicated imperative patterns that could share a core
- [Decouple Loop from Git](decouple-loop-from-git.md) — Git operations embedded in loop logic
- [Review Error Handling](review-error-handling.md) — Silent catches and fire-and-forget promises are symptoms of impure logic not being isolated

## Open Questions

### Where should this goal sit in the hierarchy?

It could be a sub-goal of [Decoupled Code](../goals/decoupled-code.md), a sibling alongside it under [Make Changes with Confidence](../goals/make-changes-with-confidence.md), or a parent of Decoupled Code and Dependency Injection. Its positioning affects how existing goals relate to it.

### Should this be a goal or a principle applied to existing goals?

The constituent ideas (dependency injection, pure functions, thin shells) are already goals. Adding an explicit goal risks redundancy. Alternatively, this could be documented as a named pattern referenced by existing goals rather than a new node in the goal tree.

### How strictly should "functional core" be interpreted?

Strict interpretation means all business logic returns values and never performs I/O. Pragmatic interpretation allows injected dependencies (like `FileSystem`) in core logic. The codebase currently uses the pragmatic approach — is that sufficient, or should we push further towards pure return values?

### What is the boundary between core and shell for commands?

Currently each command function receives `CommandDependencies` and interleaves decisions with I/O. Should commands be refactored to return descriptions of actions (like a command pattern) that the shell then executes? This would be a significant architectural shift.

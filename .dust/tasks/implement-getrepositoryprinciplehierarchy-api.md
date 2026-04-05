# Implement getRepositoryPrincipleHierarchy API

Export a new public function `getRepositoryPrincipleHierarchy()` from `@joshski/dust/artifacts`. This builds a hierarchical tree of local principles from a repository's `.dust/principles/` directory. It mirrors the existing `getCorePrincipleHierarchy()` API but operates on repository data instead of bundled core principles.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Decoupled Code](../principles/decoupled-code.md)
- [Design for Testability](../principles/design-for-testability.md)
- [Small Units](../principles/small-units.md)
- [Progressive Disclosure](../principles/progressive-disclosure.md)

## Guidance

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

### Decoupled Code

Code should be organized into independent units with explicit dependencies.

Decoupled code is easier to test, understand, and modify. Dependencies are passed in rather than hard-coded, enabling units to be tested in isolation and composed flexibly. This reduces the blast radius of changes and makes the system more maintainable.

### Design for Testability

Design code to be testable first; good structure follows naturally.

Testability should be a primary design driver, not a quality to be retrofitted. When code is designed to be testable from the start, it naturally becomes decoupled, explicit in its dependencies, and clear in its interfaces.

The discipline of testability forces good design: functions become pure, dependencies become explicit, side effects become isolated. Rather than viewing testability as a tax on production code, recognize it as a compass that points toward better architecture.

This is particularly important in agent-driven development. Agents cannot manually verify their changes—they rely entirely on tests. Code that resists testing resists autonomous modification.

### Small Units

Ideas, principles, facts, and tasks should each be as discrete and fine-grained as possible.

Small, focused documents enable precise relationships between them. A task can link to exactly the principles it serves. A fact can describe one specific aspect of the system. This granularity reduces ambiguity.

Tasks especially benefit from being small. A narrowly scoped task gives agents or humans the best chance of delivering exactly what was intended, in a single atomic commit.

Note: This principle directly supports Lightweight Planning, which explicitly mentions that "Tasks are small and completable in single commits."

### Progressive Disclosure

Dust should reveal details progressively as a way of achieving context window efficiency.

Not all information is needed at once. A task list showing just titles is sufficient for choosing what to work on. Full task details are only needed when actively implementing. Linked principles and facts can be followed when deeper context is required.

This layered approach keeps initial reads lightweight while preserving access to complete information when needed.

## Definition of Done

- New file `lib/artifacts/repository-principle-hierarchy.ts` exports `getRepositoryPrincipleHierarchy(repository: ReadOnlyArtifactsRepository): Promise<RepositoryPrincipleNode[]>`
- Type `RepositoryPrincipleNode` matches `CorePrincipleNode` structure: `{ slug: string, title: string, children: RepositoryPrincipleNode[] }`
- Function is exported from `@joshski/dust/artifacts` entry point
- Implementation uses repository interface methods (`listPrinciples()`, `parsePrinciple()`)
- Returns empty array `[]` when `.dust/principles/` directory is missing or empty
- Returns root nodes (principles with `parentPrinciple === null` or filtered parent)
- Children are sorted alphabetically by title (recursive)
- Comprehensive unit tests in `lib/artifacts/repository-principle-hierarchy.test.ts` covering:
  - Basic parent-child hierarchy
  - Multiple root nodes
  - Deep nesting (4+ levels)
  - Alphabetical sorting
  - Empty repository
  - Missing `.dust/principles/` directory
- All tests pass (`bin/dust check`)
- JSDoc documentation explains parameters, return value, and behavior
- Type `RepositoryPrincipleNode` is exported from `@joshski/dust/artifacts`

## Implementation Notes

Based on resolved questions from the idea:
- Return separate hierarchies (repository only in this task)
- No filtering support (keep API minimal)
- Minimal node structure (slug + title + children only)
- Export from `@joshski/dust/artifacts`
- Return empty array for missing directory
- Always sort alphabetically

The implementation should follow the same algorithm as `getCorePrincipleTree()`:
1. Get all principles using `repository.listPrinciples()`
2. Parse each principle using `repository.parsePrinciple({ slug })`
3. Build node map keyed by slug
4. Wire parent-child relationships based on `parentPrinciple` field
5. Identify roots (principles with no parent or parent not in set)
6. Sort recursively by title

## Decomposes Idea

(idea has been fully decomposed and deleted)

## Task Type

implement

## Blocked By

(none)

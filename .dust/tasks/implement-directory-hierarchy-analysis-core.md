# Implement Directory Hierarchy Analysis Core

Implement the pure functional core that analyzes a directory structure and identifies hierarchy issues. This function should take a directory tree structure as input and return findings about concern mixing, missing groupings, depth inconsistencies, naming issues, singleton directories, and orphaned files.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Design for Testability](../principles/design-for-testability.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)
- [Intuitive Directory Structure](../principles/intuitive-directory-structure.md)

## Guidance

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

### Design for Testability

Design code to be testable first; good structure follows naturally.

Testability should be a primary design driver, not a quality to be retrofitted. When code is designed to be testable from the start, it naturally becomes decoupled, explicit in its dependencies, and clear in its interfaces.

The discipline of testability forces good design: functions become pure, dependencies become explicit, side effects become isolated. Rather than viewing testability as a tax on production code, recognize it as a compass that points toward better architecture.

This is particularly important in agent-driven development. Agents cannot manually verify their changes—they rely entirely on tests. Code that resists testing resists autonomous modification.

### Comprehensive Test Coverage

A project's test suite is its primary safety net, and agents depend on it even more than humans do.

Agents cannot manually verify that their changes work. They rely entirely on automated tests to confirm correctness. Gaps in test coverage become gaps in agent capability — areas where changes are risky and feedback is absent. Comprehensive coverage means every meaningful behaviour is tested, so agents can make changes anywhere in the codebase with confidence.

Dust should help projects measure and improve their test coverage, flag untested areas, and encourage a culture where new code comes with new tests.

### Intuitive Directory Structure

Code should be organized around related concerns in clearly named directories.

When files that serve similar purposes are grouped together, the codebase becomes easier to navigate and understand. A developer looking for "commands" should find them in a `commands` directory. Utilities should live with utilities. This organization reduces cognitive load and makes the project structure self-documenting.

## Task Type

implement

## Blocked By

(none)

## Analysis Areas

The analysis function should identify:

1. **Concern mixing** - Directories containing files that serve different purposes
2. **Missing logical groupings** - Related files scattered across multiple locations
3. **Depth inconsistency** - Context-aware depth analysis (not absolute thresholds)
4. **Naming consistency** - Directory names that don't follow established patterns
5. **Singleton directories** - Directories with a single file/subdirectory adding unnecessary nesting
6. **Orphaned files** - Files at inappropriate levels

## Implementation Approach

1. Create a pure function in a new module (e.g., `lib/audits/directory-hierarchy-analysis.ts`)
2. Input: Directory tree structure (excludes: node_modules, .git, dist, build, coverage, etc.)
3. Output: Array of findings, each with:
   - Issue type (concern-mixing, missing-grouping, depth-inconsistency, etc.)
   - Affected paths
   - Description of the problem
   - Suggested reorganization
   - Migration complexity score (low/medium/high based on files affected)

4. Keep analysis logic separate from I/O (file system reading will be in the imperative shell)
5. Focus on all project directories (not just source), but with hard-coded exclusions for conventions

## Definition of Done

- Pure analysis function implemented that takes directory tree structure and returns findings
- Function has no side effects (file system access happens in calling code)
- Comprehensive unit tests covering all six analysis areas
- Tests use readable test data that mirrors real directory structures
- Analysis excludes conventional directories (node_modules, .git, dist, build, coverage)
- Each finding includes migration complexity score (low/medium/high)
- No changes to stock-audits.ts yet (that's the next task)

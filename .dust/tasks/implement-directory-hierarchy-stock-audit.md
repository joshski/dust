# Implement Directory Hierarchy Stock Audit

Add a `directory-hierarchy` stock audit that reviews directory structure and creates improvement ideas. It uses the analysis core from the previous task.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Intuitive Directory Structure](../principles/intuitive-directory-structure.md)
- [Small Units](../principles/small-units.md)

## Guidance

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

### Intuitive Directory Structure

Code should be organized around related concerns in clearly named directories.

When files that serve similar purposes are grouped together, the codebase becomes easier to navigate and understand. A developer looking for "commands" should find them in a `commands` directory. Utilities should live with utilities. This organization reduces cognitive load and makes the project structure self-documenting.

### Small Units

Ideas, principles, facts, and tasks should each be as discrete and fine-grained as possible.

Small, focused documents enable precise relationships between them. A task can link to exactly the principles it serves. A fact can describe one specific aspect of the system. This granularity reduces ambiguity.

Tasks especially benefit from being small. A narrowly scoped task gives agents or humans the best chance of delivering exactly what was intended, in a single atomic commit.

## Task Type

implement

## Blocked By

(none)

## Implementation Approach

This task implements the imperative shell that:
1. Reads the actual directory structure from the file system
2. Calls the pure analysis function (from the previous task)
3. Creates idea files for each finding

Add the `directoryHierarchy()` function to `lib/audits/stock-audits.ts` following the pattern of existing audits like `dataAccessReview()` and `coverageExclusions()`.

The audit template should:
- Map the directory tree (excluding standard directories)
- Call the analysis function from `directory-hierarchy-analysis.ts`
- Create idea files in `.dust/ideas/` for each finding
- Include specific paths, problem description, proposed reorganization, and migration complexity

## Output Format

Each idea should include:
- Current directory structure issue (specific paths)
- Why the current structure is problematic
- Proposed reorganization with before/after structure
- Migration impact and complexity score

## Definition of Done

- `directoryHierarchy()` function added to `lib/audits/stock-audits.ts`
- Function added to the `stockAudits` export array
- Audit template follows the established pattern (includes description, scope, analysis steps)
- Template instructs agent to review existing ideas to avoid duplication
- Template specifies creating ideas for findings (not modifying source code)
- Audit uses the pure analysis function from `directory-hierarchy-analysis.ts`
- Manual test: Run `dust audit directory-hierarchy` in a sample repository and verify it creates appropriate ideas

# Implement: Validate open question options are unique

Add a uniqueness check to `validateIdeaOpenQuestions` so that duplicate option headings under the same question are reported as violations.

## Task Type

implement

## Blocked By

(none)

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Actionable Errors](../principles/actionable-errors.md)
- [Design for Testability](../principles/design-for-testability.md)
- [Co-located Tests](../principles/co-located-tests.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)

## Guidance

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

### Actionable Errors

Error messages should tell you what to do next, not just what went wrong.

When something fails, the message should provide:
- A clear description of the problem
- Specific guidance on how to fix it
- Context needed to take the next step

This is especially important for AI agents, who need concrete instructions to recover autonomously. A good error message turns a dead end into a signpost.

### Design for Testability

Design code to be testable first; good structure follows naturally.

Testability should be a primary design driver, not a quality to be retrofitted. When code is designed to be testable from the start, it naturally becomes decoupled, explicit in its dependencies, and clear in its interfaces.

The discipline of testability forces good design: functions become pure, dependencies become explicit, side effects become isolated. Rather than viewing testability as a tax on production code, recognize it as a compass that points toward better architecture.

This is particularly important in agent-driven development. Agents cannot manually verify their changes—they rely entirely on tests. Code that resists testing resists autonomous modification.

### Co-located Tests

Test files should live next to the code they test.

When tests are co-located with their source files, developers can immediately see what's tested and what isn't. Finding the test for a module becomes trivial—it's right there in the same directory. This proximity encourages writing tests as part of the development flow rather than as an afterthought, and makes it natural to update tests when modifying code.

### Unit Test Coverage

Complete unit test coverage ensures low-level tests give users direct feedback as they change the code.

Excluding system tests from coverage reporting focuses attention on unit tests - the tests that provide the fastest, most specific feedback. When coverage tools only measure unit tests, developers can quickly identify which parts of the codebase lack fine-grained test protection.

## Implementation Notes

The fix lives entirely within `lib/lint/validators/idea-validator.ts`, which is already a pure functional core — `validateIdeaOpenQuestions` takes a `ParsedArtifact` and returns `Violation[]` with no side effects.

Add a `Set<string>` to track option names for the current question. Reset it each time a new `### ` question heading is encountered (alongside the existing `currentQuestionLine` reset). When a `#### ` heading is encountered, compare its name against the set:

- If already present → push a violation pointing to the duplicate line
- Otherwise → add it to the set

The uniqueness check is **case-sensitive** (matching the existing heading comparison behaviour in the validator and how markdown headings work).

The violation message should name the duplicate option and tell the author to rename or remove it, e.g.:
`Duplicate option "Yes" under question "Should we do X?" — each option must have a unique name`

## Definition of Done

- `validateIdeaOpenQuestions` reports a violation when two `#### ` headings under the same `### ` question have identical names (case-sensitive)
- No violation is reported when the same option name appears under different questions
- The violation message names the duplicate option and tells the author what to do
- Unit tests cover: duplicate options under one question, same name under different questions (no violation), and a mix of both
- `bin/dust check` passes

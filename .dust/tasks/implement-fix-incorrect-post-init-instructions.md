# Implement: Fix Incorrect Post-Init Instructions

`dust init` prints next-step suggestions that wrongly prefix `claude` and `codex` with the package runner from `dustCommand`. When `dustCommand` is `bunx dust`, the output suggests `bunx claude "..."`. This is wrong — `claude` and `codex` are standalone CLIs, not subcommands of `bunx`/`npx`/`pnpx`.

Replace the `${runner}` prefix in the post-init suggestions with the literal strings `claude` and `codex`. The `runner` variable should not exist at all once this is done, since it is only used for these incorrect lines.

## Task Type

implement

## Blocked By

(none)

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Unsurprising UX](../principles/unsurprising-ux.md)
- [Co-located Tests](../principles/co-located-tests.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)

## Guidance

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

### Unsurprising UX

The user interface should be as "guessable" as possible.

Following the [Principle of Least Astonishment](https://en.wikipedia.org/wiki/Principle_of_least_astonishment), users form expectations about how a tool will behave based on conventions, prior experience, and intuition. Dust's interface (including the CLI) should match those expectations wherever possible. If users are observed trying to use the interface in ways we didn't anticipate, the interface should be adjusted to meet their expectations — even if that means supporting many ways of achieving the same result.

Surprising behavior erodes trust and slows people down. Unsurprising behavior lets users stay in flow.

### Co-located Tests

Test files should live next to the code they test.

When tests are co-located with their source files, developers can immediately see what's tested and what isn't. Finding the test for a module becomes trivial—it's right there in the same directory. This proximity encourages writing tests as part of the development flow rather than as an afterthought, and makes it natural to update tests when modifying code.

### Unit Test Coverage

Complete unit test coverage ensures low-level tests give users direct feedback as they change the code.

Excluding system tests from coverage reporting focuses attention on unit tests - the tests that provide the fastest, most specific feedback. When coverage tools only measure unit tests, developers can quickly identify which parts of the codebase lack fine-grained test protection.

### Comprehensive Test Coverage

A project's test suite is its primary safety net, and agents depend on it even more than humans do.

Agents cannot manually verify that their changes work. They rely entirely on automated tests to confirm correctness. Gaps in test coverage become gaps in agent capability — areas where changes are risky and feedback is absent. Comprehensive coverage means every meaningful behaviour is tested, so agents can make changes anywhere in the codebase with confidence.

Dust should help projects measure and improve their test coverage, flag untested areas, and encourage a culture where new code comes with new tests.

## Implementation Notes

The change lives entirely within `lib/cli/commands/init.ts` and `lib/cli/commands/init.test.ts`.

In `init.ts`:

- Remove the `const runner = dustCommand.split(' ')[0]` line.
- In the three suggestion lines, drop `${runner} ` so the output is `claude "..."` and `codex "..."` rather than `${runner} claude "..."` etc.

The `dustCommand` variable is still needed for the `CLAUDE.md` / `AGENTS.md` content and the warning text — only the agent CLI suggestions change.

Three existing tests in `init.test.ts` currently assert the buggy behaviour and will fail until they are updated:

- `suggestions use npx runner when package-lock.json exists` — asserts `> npx claude` / `> npx codex`
- `suggestions use bunx runner when bun.lockb exists` — asserts `> bunx claude` / `> bunx codex`
- `suggestions use pnpx runner when pnpm-lock.yaml exists` — asserts `> pnpx claude` / `> pnpx codex`

These three tests should be replaced (or collapsed into one) so they assert that the suggestions use bare `claude` and `codex` regardless of which package manager was detected. A single test that runs `init` with each lockfile and checks the output contains `> claude ` and `> codex ` (with no runner prefix) is sufficient.

### Functional Core, Imperative Shell consideration

`init.ts` mixes message generation with I/O in one large function. Extracting the next-steps message into a pure function is a reasonable application of FCIS, but is **out of scope** for this fix — keep the change minimal and focused on the bug. If extraction would make the change easier (e.g. easier to test the exact output), do it; otherwise leave the structure as-is and let a separate task address it.

## Definition of Done

- `lib/cli/commands/init.ts` no longer prefixes `claude` or `codex` with the detected package runner; the output uses bare `claude` and `codex`.
- The `runner` variable is removed from `init.ts` (it has no remaining use).
- The three existing tests that assert `npx claude`, `bunx claude`, `pnpx claude` (and the corresponding `codex` lines) are updated or replaced so the suite asserts the correct, runner-free output across all detected package managers.
- `bin/dust check` passes.

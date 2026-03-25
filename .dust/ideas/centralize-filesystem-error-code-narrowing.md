# Centralize filesystem error code narrowing

Error-code checks for `ENOENT` and `EEXIST` are implemented via repeated `as NodeJS.ErrnoException` assertions across runtime code. Centralizing this pattern would reduce repeated assertions and make error-handling intent more explicit.

## Current State

### Repeated errno assertions in production code

`rg "as NodeJS.ErrnoException" lib -g"*.ts" -g"!*.test.ts"` returns 28 matches. These appear in key paths including:
- `lib/cli/commands/lint-markdown.ts`
- `lib/cli/commands/init.ts`
- `lib/git/hooks.ts`
- `lib/config/settings.ts`
- `lib/validation/index.ts`

Most call sites check `error.code` for `ENOENT` or `EEXIST`, then continue or rethrow.

### Pattern is operationally important

These checks are used to preserve best-effort behavior when files disappear between `exists` and `read`/`readdir`, and to distinguish expected races from real infrastructure failures.

### Tests mirror the same cast-heavy style

Test files also set error codes with `as NodeJS.ErrnoException` before asserting behavior. Any runtime refactor should account for test helpers to avoid duplicating ad hoc error construction.

## Findings

### This is a cohesive refactor opportunity

Unlike broader type-safety topics, errno narrowing is one consistent pattern with clear extraction potential (type guard + code predicate helpers).

### Call-site readability is currently noisy

Repeated inline assertions make catch blocks harder to scan and increase the chance of inconsistent behavior (`===` vs `!==`, different handled codes).

### Scope should stay limited to filesystem-style errors

This idea should avoid becoming a global error taxonomy effort. The narrow goal is `error.code` checks around known Node-style filesystem errors.

## Open Questions

### What helper API shape should we standardize on?

#### Typed guard plus code-specific predicates

Add `isErrnoException(error)` and focused helpers like `isErrorCode(error, 'ENOENT')` / `isErrorCode(error, 'EEXIST')`. This keeps catch blocks concise and explicit.

#### One generic helper only

Add only `isErrnoException(error)` and keep per-code comparisons inline. Smaller API surface, but less consistency at call sites.

### Where should these helpers live?

#### Shared low-level module

Create a shared helper in a neutral location (for example `lib/filesystem/error-codes.ts` or similar) and use it across CLI, validation, git, and config modules.

#### Keep module-local helpers

Define small helpers near each subsystem to avoid a new cross-cutting module. This preserves locality but may repeat logic.

### Should tests get dedicated errno factories?

#### Add test utility for errno errors

Create a helper in `lib/test-support/test-utilities.ts` for constructing typed errors with `code` set. Reduces repeated test casting and aligns runtime/test patterns.

#### Keep tests as-is for now

Refactor production catch logic first; defer test cleanup to a separate pass to keep implementation risk low.

# Establish consistent error handling

Commands use two strategies for errors, with no documented convention.

1. `context.stderr()` + return `{ exitCode: 1 }` — used for user-facing errors (bad input, missing `.dust` directory, unknown command). Examples: `focus.ts`, `check.ts`, `list.ts`, `next.ts`, `pick-task.ts`.
2. `catch` + re-throw — used for infrastructure/filesystem errors where only specific error codes (e.g. `EEXIST`) are handled; unexpected errors are re-thrown. Examples: `init.ts`, `lint-markdown.ts`.
3. Bare `throw new Error()` — used in lower-level infrastructure code for unrecoverable failures. Examples: `spawn-claude-code.ts` (failed to get stdout from process).

The third pattern (bare throw) is used in library code below the command layer, which is appropriate. The real issue is that `wireEntry` in `wire.ts` does not catch unhandled rejections from commands — if an infrastructure throw propagates up, it crashes the process with an unhandled rejection rather than a clean error message and exit code.

The proposed convention is already partially in practice:
- User input errors → `context.stderr()` + `return { exitCode: 1 }`
- Infrastructure failures → throw (re-throw or bare throw)

What's missing is a top-level error handler in `wireEntry` that catches infrastructure throws and converts them to `context.stderr()` + `exit(1)`.

## Open Questions

### What should the top-level handler in `wireEntry` print when an infrastructure error escapes?

#### Print just the error message

Less noisy for users. Hides implementation details. Matches the style of user-facing errors.

#### Print the full stack trace

More useful for debugging unexpected failures. Stack traces help identify the root cause.

### Should infrastructure errors be distinguishable from user errors at the type level?

#### Use a custom `UserError` class

Commands throw `UserError` for user-facing problems; the top-level handler prints it cleanly. All other errors get stack traces. Clear type-level separation.

#### Rely on call-site convention only

User input errors use `context.stderr()` + `return { exitCode: 1 }`. Infrastructure failures throw. No new types needed, but requires discipline to maintain.

### Where should the convention be documented?

#### In a fact file (`.dust/facts/`)

Aligns with how other design decisions are recorded in this project.

#### In a comment in `wire.ts`

Co-located with the top-level handler that enforces it. Easy to find when working on the entry point.

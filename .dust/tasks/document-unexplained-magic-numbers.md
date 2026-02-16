# Document unexplained magic numbers

Add inline comments to hard-coded numeric constants that lack rationale.

## Goals

- [Clarity over brevity](../goals/clarity-over-brevity.md)
- [Context-optimised code](../goals/context-optimised-code.md)

## Blocked By

(none)

## Definition of Done

- [ ] Each magic number in the following files has a brief inline comment explaining its rationale:
  - `lib/bucket/log-buffer.ts` - `MAX_LINES`, `TRIM_TO_LINES`
  - `lib/cli/commands/check.ts` - `DEFAULT_CHECK_TIMEOUT_MS`
  - `lib/cli/commands/loop.ts` - `SLEEP_INTERVAL_MS`, `DEFAULT_MAX_ITERATIONS`
  - `lib/cli/commands/lint-markdown.ts` - `MAX_OPENING_SENTENCE_LENGTH`
- [ ] No test failures introduced

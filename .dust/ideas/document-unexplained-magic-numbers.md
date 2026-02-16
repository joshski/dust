# Document unexplained magic numbers

Several files contain hard-coded numeric constants without explanation of why those values were chosen.

Examples:

- `lib/bucket/log-buffer.ts` - `MAX_LINES = 5000`, `TRIM_TO_LINES = 3000`
- `lib/cli/commands/check.ts` - `DEFAULT_CHECK_TIMEOUT_MS = 13000`
- `lib/cli/commands/loop.ts` - `SLEEP_INTERVAL_MS = 30000`, `DEFAULT_MAX_ITERATIONS = 10`
- `lib/cli/commands/lint-markdown.ts` - `MAX_OPENING_SENTENCE_LENGTH = 150`

Adding a brief inline comment explaining the rationale (performance constraint, UX trade-off, empirical tuning) would make each constant self-documenting.

# Truncate Long Check Failure Output

When a check fails with extremely long output (over 500 lines), truncate the middle portion to keep the output scannable for agents and humans.

## Implementation

In `lib/cli/commands/check.ts`, add a `truncateOutput` function that:
1. Splits output into lines
2. If line count exceeds 500, keeps the first 250 lines and last 250 lines
3. Inserts a marker line showing how many lines were snipped

Example output format:
```
error line 1
error line 2
...
error line 250
[...snip 123457 lines...]
error line 123708
...
error line 123958
```

Call this function in `displayResults` before outputting `result.output`.

## Testing

Add unit tests for the truncation function covering:
- Output shorter than 500 lines (no truncation)
- Output exactly 500 lines (no truncation)
- Output of 501 lines (truncation with 1 line snipped)
- Output of 1000 lines (truncation with marker)

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md)

## Blocked By

(none)

## Definition of Done

- [ ] `truncateOutput` function implemented in `check.ts`
- [ ] Function called in `displayResults` for failed check output
- [ ] Unit tests pass for all edge cases
- [ ] `bin/dust check` passes

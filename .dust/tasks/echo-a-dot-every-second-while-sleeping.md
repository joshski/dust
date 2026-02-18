# Echo a dot every second while sleeping

Add visible sleep progress to `dust loop` by printing a dot once per second while the loop is idle with no tasks. Update the no-task branch in `lib/cli/commands/loop.ts` (currently `log('sleeping, no tasks')` followed by a single `sleep(SLEEP_INTERVAL_MS)`) so users can see ongoing activity during the wait period. Keep behavior equivalent to the current 10-second idle delay, but split the wait into one-second steps that emit `.` to `context.stdout`, then end the line cleanly before the next loop output.

Update `lib/cli/commands/loop.test.ts` to cover the new output behavior in the sleeping path. Add assertions that confirm dots are emitted while idle and that sleeping iterations still do not count toward `maxIterations`.

## Goals
- [Unsurprising UX](../goals/unsurprising-ux.md)
- [Fast Feedback Loops](../goals/fast-feedback-loops.md)

## Blocked By
(none)

## Definition of Done
- [ ] `dust loop` prints one dot per second during no-task sleep intervals.
- [ ] Sleep duration remains effectively `SLEEP_INTERVAL_MS` and sleep iterations still do not count toward max iterations.
- [ ] Loop output formatting remains readable (sleep progress line is terminated before subsequent messages).
- [ ] Tests in `lib/cli/commands/loop.test.ts` cover the new sleeping output behavior.

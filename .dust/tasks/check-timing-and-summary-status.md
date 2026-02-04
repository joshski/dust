# Check timing and summary status

The `dust check` command should provide timing feedback for slow checks and a visual summary indicator.

## Changes Required

### 1. Show timing for slow checks

Modify `lib/cli/commands/check.ts` to track execution time for each check and display it when a check exceeds 1 second:

- In `CheckResult` interface, add a `durationMs?: number` field
- In `runConfiguredChecks`, record start time before `runner.run()` and calculate duration after
- In `runValidationCheck`, similarly track timing around the `lintMarkdown()` call
- In `displayResults`, append `[X.Xs]` to the check status line when `durationMs >= 1000`
- Round to one decimal place (e.g., 1234ms → `[1.2s]`)

Example output:
```
✓ lint markdown
✓ typecheck [2.3s]
✓ tests [4.1s]
✗ slow failing check [1.5s]
```

### 2. Add status indicator to summary

Modify the summary line to include a visual pass/fail indicator:

- All passed: `✓ 3/3 checks passed`
- Any failed: `✗ 2/3 checks passed`

### Test updates

Update `lib/cli/commands/check.test.ts`:

- Add `durationMs` to mock runner results to support timing tests
- Test that timing is NOT shown for checks under 1 second
- Test that timing IS shown for checks at or over 1 second
- Test the ✓ indicator appears in summary when all pass
- Test the ✗ indicator appears in summary when any fail
- Update existing test expectations that check `stdoutLines` to include the new ✓/✗ in the summary

## Goals

- [Fast Feedback](../goals/fast-feedback.md)
- [Progressive Disclosure](../goals/progressive-disclosure.md)

## Blocked By

(none)

## Definition of Done

- [ ] `CheckResult` interface includes `durationMs` field
- [ ] Check timing is tracked for both configured checks and built-in validation
- [ ] Timing shown as `[X.Xs]` for checks taking ≥1000ms
- [ ] Summary line includes ✓ when all checks pass
- [ ] Summary line includes ✗ when any check fails
- [ ] All existing tests updated and passing
- [ ] New tests added for timing display and summary indicators
- [ ] `dust check` runs successfully on this repository

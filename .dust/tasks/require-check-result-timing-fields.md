# Require Check Result Timing Fields

Make `durationMs` and `timedOut` required in `CheckResult`. These fields are always present in practice, but optionality forces unnecessary defensive coding.

## Background

In `lib/cli/commands/check.ts`, the `CheckResult` interface marks timing fields as optional:

```typescript
interface CheckResult {
  name: string
  command: string
  exitCode: number
  output: string
  isBuiltIn?: boolean
  hints?: string[]
  durationMs?: number
  timedOut?: boolean
  timeoutSeconds?: number
}
```

However, `runSingleCheck` always assigns `durationMs`, `timedOut`, and `timeoutSeconds`. The built-in `runValidationCheck` currently only sets `durationMs`, but could set `timedOut: false` since built-in checks don't use timeouts.

The optionality forces defensive checks like `result.durationMs !== undefined` in `displayResults` when the value is guaranteed present.

## Implementation

1. Update `runValidationCheck` to return `timedOut: false` (built-in checks never timeout)
2. Change `CheckResult` to make `durationMs` and `timedOut` required
3. Remove the `durationMs !== undefined` check in `displayResults`
4. Keep `timeoutSeconds` optional since it's only meaningful for checks that can timeout

## Principles

- [Make Changes with Confidence](../principles/make-changes-with-confidence.md)

## Blocked By

(none)

## Definition of Done

- [ ] `durationMs` is a required field in `CheckResult`
- [ ] `timedOut` is a required field in `CheckResult`
- [ ] `runValidationCheck` returns `timedOut: false`
- [ ] Defensive `undefined` checks are removed from `displayResults`
- [ ] All checks pass (`bin/dust check`)

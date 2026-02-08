# Add implicit timeouts to dust check

Add a 13-second implicit timeout to each check run by `dust check`. Any check that exceeds this limit should be killed, and any captured stdout/stderr should be printed prefixed with a notice explaining the timeout and how to configure a different value. Each check in `.dust/config/settings.json` should accept either a string (the command) or an object with `command` and `timeoutMilliseconds` properties.

## Technical Details

### Settings format change

The `checks` array in `.dust/config/settings.json` currently requires objects with `name`, `command`, and optional `hints`. Extend this so each entry can also be a plain string (treated as the command, with the name derived from the command text). Add an optional `timeoutMilliseconds` property to the object form. The default timeout is 13000ms.

Example settings showing both formats:

```json
{
  "checks": [
    "npm run lint",
    { "name": "test", "command": "npm test", "timeoutMilliseconds": 30000 },
    { "name": "build", "command": "npm run build" }
  ]
}
```

### Type changes (`lib/cli/types.ts`)

- Add `timeoutMilliseconds?: number` to `CheckConfig`
- The `loadSettings` function in `lib/config/settings.ts` should normalize string entries into `CheckConfig` objects (deriving `name` from the command string)

### Process runner changes (`lib/cli/process-runner.ts`)

- Add an optional `timeoutMs` parameter to the `ShellRunner.run` interface: `run(command: string, cwd: string, timeoutMs?: number) => Promise<ProcessResult>`
- Add a `timedOut?: boolean` field to `ProcessResult`
- In `runBufferedProcess`, when `timeoutMs` is provided, set a `setTimeout` that calls `proc.kill()` after the deadline. On kill, resolve the promise with `exitCode: 1`, `timedOut: true`, and whatever output was captured so far. Clear the timer on normal `close` or `error` events.

### Check command changes (`lib/cli/commands/check.ts`)

- In `runConfiguredChecks`, pass `check.timeoutMilliseconds ?? 13000` as the timeout to `runner.run()`
- Add a `timedOut?: boolean` field to `CheckResult`
- In `displayResults`, when a check has `timedOut: true`:
  - Display the status line as `✗ <name> [timed out after <N>s]` (where N is the configured or default timeout in seconds)
  - When printing the failed output, prefix it with a notice line: `Note: This check was killed after <N>s. To configure a different timeout, set "timeoutMilliseconds" in the check configuration in .dust/config/settings.json`
  - Still print any captured stdout/stderr below the notice

### Constant

Define the default timeout as a named constant `DEFAULT_CHECK_TIMEOUT_MS = 13000` in `check.ts`.

## Goals

- [Fast Feedback](../goals/fast-feedback.md)
- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)

## Blocked By

(none)

## Definition of Done

- [ ] `CheckConfig` in `lib/cli/types.ts` has an optional `timeoutMilliseconds` field
- [ ] `ProcessResult` in `lib/cli/process-runner.ts` has a `timedOut` field
- [ ] `ShellRunner.run` accepts an optional `timeoutMs` parameter
- [ ] `runBufferedProcess` kills the process and resolves with `timedOut: true` when the timeout elapses
- [ ] `runBufferedProcess` clears the timeout timer on normal completion
- [ ] `check.ts` passes the configured (or default 13s) timeout to the runner
- [ ] `CheckResult` has a `timedOut` field
- [ ] Timed-out checks display `✗ <name> [timed out after <N>s]` in the status line
- [ ] Timed-out checks print a notice explaining how to configure the timeout
- [ ] Timed-out checks still print any captured stdout/stderr
- [ ] String entries in the `checks` array are normalized to `CheckConfig` objects during settings load
- [ ] Unit tests cover: timeout kills process, output captured before timeout, normal completion clears timer, timed-out display format, string check normalization
- [ ] All existing tests continue to pass

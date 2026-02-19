# Rework logging ergonomics

Rework the logging module so that file logging and stdout logging are independent concerns. File logging is always-on for server/long-running commands; `DEBUG` controls stdout output only.

## Background

Currently `createLogger(name, sink?)` requires `DEBUG` to be set for anything to be written, and callers can optionally inject a sink. The new design separates two concerns:

- **File logging** — activated explicitly by long-running commands (`dust loop`, `dust bucket`) via `enableFileLogs(scope)`. Writes all logs unfiltered to `~/.dust/logs/<scope>.log`. Not affected by `DEBUG`.
- **Stdout logging** — activated by `DEBUG=pattern`. Writes matching logs to stdout. Works in any command, regardless of whether file logging is enabled.

## Changes required

### `lib/logging/index.ts`

- Remove the `sink` parameter from `createLogger` — callers no longer choose a sink.
- Add `enableFileLogs(scope: string): void` — called at startup by server commands; creates a `FileSink` writing to `~/.dust/logs/<scope>.log`.
- `createLogger(name)` now writes to two places independently:
  - File sink (if `enableFileLogs` was called), always, no filtering.
  - `process.stdout` if `DEBUG` is set and `name` matches the pattern.
- `_reset()` must reset both the active file sink and the stdout patterns.
- Remove `isEnabled` or update its semantics to reflect stdout-only filtering.
- Remove the `setLogScope` re-export (replaced by `enableFileLogs`).

### `lib/logging/sink.ts`

- Change the log directory from `<cwd>/log/dust/` to `~/.dust/logs/` (use `os.homedir()`).
- `FileSink` should accept the home directory as an injected dependency (for testability), defaulting to `os.homedir()`.
- Remove `setScope`, `setLogScope`, `defaultSink`, and the `DEBUG_LOG_SCOPE` env var — scope is now set at construction time via `enableFileLogs`.
- The `LogSink` interface can stay as-is.

### `lib/logging/index.test.ts`

- Remove the `fakeSink` helper and the `sink` argument from all `createLogger` calls.
- Add tests for `enableFileLogs`: verify lines are written to the file sink when enabled, and not written when not enabled.
- Add tests for stdout: verify `process.stdout.write` is called when `DEBUG` matches and not called otherwise. Stub `process.stdout.write` in tests.
- Ensure tests cover the case where both file logging and stdout logging are active simultaneously.

### `lib/logging/sink.test.ts`

- Update path assertions to use homedir pattern (`~/.dust/logs/`) instead of `<cwd>/log/dust/`.
- Remove tests for `setScope` and `DEBUG_LOG_SCOPE`.
- Update `FileSink` construction to pass a fake home directory string.

### Callers of `setLogScope`

Search for `setLogScope` and `setScope` usages and replace with `enableFileLogs(scope)` in the relevant command startup files (likely `dust loop` and `dust bucket`).

## Goals

- [Debugging Tooling](../goals/debugging-tooling.md)
- [Development Traceability](../goals/development-traceability.md)
- [Dependency Injection](../goals/dependency-injection.md)

## Blocked By

(none)

## Definition of Done

- [ ] `createLogger(name)` takes no `sink` parameter
- [ ] `enableFileLogs(scope)` activates file logging to `~/.dust/logs/<scope>.log`
- [ ] `DEBUG=pattern` writes matching logs to stdout only
- [ ] File and stdout logging work independently and simultaneously
- [ ] `lib/logging/sink.ts` uses `~/.dust/logs/` and injects home directory for testability
- [ ] All existing tests pass with updated assertions
- [ ] New tests cover the `enableFileLogs` activation path and stdout behaviour
- [ ] `bin/dust check` passes

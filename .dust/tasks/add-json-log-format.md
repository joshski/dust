# Add JSON Log Format

Add a JSON Lines (JSONL) output mode to the logging system, activated via `DUST_LOG_FORMAT=json`.

## Background

The [Development Traceability](../principles/development-traceability.md) principle calls for "structured logging and tracing" to help agents "understand system behaviour without resorting to ad-hoc testing cycles." Currently, dust's logging produces human-readable text that agents must parse with regex to extract structured information.

## Implementation

Following the [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) principle, add a pure `formatJsonLine` function alongside the existing `formatLine` in `lib/logging/match.ts`. The function takes a log entry and returns a JSON string.

### Schema (Minimal)

Required fields only:
- `ts` — ISO 8601 timestamp
- `logger` — logger name (e.g. `dust.loop`)
- `level` — always `"info"` for now (single level)
- `msg` — the message string

Additional context fields are passed through as-is (e.g. `iteration`, `duration`).

### Configuration

- `DUST_LOG_FORMAT=json` — output JSON Lines to stdout/file
- `DUST_LOG_FORMAT=text` — current text format (default)
- `DEBUG` filtering remains orthogonal — controls which loggers emit, not the format

### Changes

1. Add `LoggingConfig.logFormat?: 'json' | 'text'` in `lib/env-config.ts`
2. Add `formatJsonLine(entry: LogEntry): string` in `lib/logging/match.ts`
3. Update `createLoggingService` to select formatter based on config
4. Add `LogEntry` type for structured log data with optional context fields
5. Update `LogFn` signature to accept optional context object

## Principles

- [Development Traceability](../principles/development-traceability.md)
- [Debugging Tooling](../principles/debugging-tooling.md)
- [Agent Autonomy](../principles/agent-autonomy.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Blocked By

(none)

## Definition of Done

- `DUST_LOG_FORMAT=json` produces valid JSON Lines output
- Each log line contains `ts`, `logger`, `level`, `msg` fields
- Optional context fields are included in JSON output
- Text format remains the default when `DUST_LOG_FORMAT` is unset
- DEBUG filtering works identically for both formats
- Unit tests cover both formats and their interaction with DEBUG

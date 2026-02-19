# Add per-logger file routing in logging module

Add support in `lib/logging/index.ts` for routing a subset of logger output to a dedicated file without changing global log routing for other loggers. Keep existing behavior of `enableFileLogs(scope)` + `createLogger(name)` fully backward compatible.

Implement an optional per-logger file override API, for example `createLogger(name, { file?: string | false })`, so callers can direct one logger to `./log/<custom>.log` while other loggers continue writing to the default sink. Ensure `file: false` disables file writes for that logger while preserving stdout behavior controlled by `DEBUG` matching.

Internally, add sink selection precedence in `createLogger`: per-logger sink first, global sink second, no file sink otherwise. Cache file sinks by path so multiple loggers targeting the same file share one sink instance.

Update docs and types in `dist/logging/index.d.ts` and source comments to describe the new API and behavior, including interaction with `enableFileLogs` and `DUST_LOG_FILE` inheritance.

Add tests that cover:
- default behavior unchanged when no per-logger options are passed
- custom file routing writes only the targeted logger to the custom file
- `file: false` suppresses file output for that logger
- stdout `DEBUG` filtering remains unchanged for all loggers

## Goals

- [Debugging Tooling](../goals/debugging-tooling.md)
- [Development Traceability](../goals/development-traceability.md)

## Blocked By

(none)

## Definition of Done

- [ ] `createLogger` supports a per-logger file override in source and built type definitions
- [ ] Existing callers using current logging APIs require no code changes and keep current behavior
- [ ] File sink routing precedence is implemented and documented
- [ ] Sink instances are reused per file path to avoid duplicate sink objects
- [ ] Automated tests verify default routing, custom file routing, `file: false`, and DEBUG stdout behavior
- [ ] `bin/dust lint` passes

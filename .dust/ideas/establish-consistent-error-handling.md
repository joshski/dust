# Establish consistent error handling

Add a top-level error handler in `wireEntry` to catch unhandled errors from commands and convert them to clean error messages with exit code 1.

**Note:** A repeatable audit for error handling is now available: `bin/dust audit error-handling`.

Currently, `wireEntry` in [`lib/cli/wire.ts`](../../lib/cli/wire.ts) does not catch unhandled rejections. If an infrastructure error (filesystem failure, network error, etc.) propagates up from a command, the process crashes with an unhandled rejection rather than showing a clean error message.

The codebase already follows two appropriate patterns:
1. **User input errors** → `context.stderr()` + `return { exitCode: 1 }`
2. **Infrastructure failures** → `throw` (handled by ENOENT checks where appropriate, otherwise propagated)

The missing piece is a final safety net in `wireEntry` that catches any escaped exceptions and converts them to `context.stderr()` + `exit(1)`.

## Findings

### Existing error handling is mostly sound

The codebase already handles errors appropriately in most places:
- Commands use `context.stderr()` + exit code 1 for user-facing errors
- ENOENT checks with re-throw for file operations avoid swallowing unexpected errors
- Infrastructure errors are thrown and propagated

### Debug logging is appropriately best-effort

[`lib/logging/sink.ts`](../../lib/logging/sink.ts) silently swallows errors because logging should never crash the application. This is an appropriate exception to "no error swallowing" since:
- It's explicitly documented ("Best-effort — never crash the caller")
- Logging is non-critical infrastructure
- Failing to log is recoverable (the app continues working)

### JSON parsing in event streams is defensive

`spawn-claude-code.ts` and `spawn-codex.ts` skip malformed JSON lines. This is appropriate because:
- External process output may include non-JSON debug lines
- The overall stream processing continues
- Real errors from the spawned process are captured via exit code and stderr

### Agent instructions loading could be improved

`agent-shared.ts:loadAgentInstructions` swallows all errors when reading optional config files. Since it already checks `fileSystem.exists()` before reading, the catch block only triggers for non-ENOENT errors (permissions, I/O failures). These should probably propagate rather than silently returning an empty string.

## Open Questions

### Should `loadAgentInstructions` propagate non-ENOENT errors?

#### Propagate errors

If reading the file fails after confirming it exists, something is wrong (permissions, disk error). The user should know. This aligns with "no error swallowing".

#### Keep silent fallback

The agent instructions file is optional enhancement. Failing silently means the agent continues working without custom instructions rather than blocking entirely.

### Where should the convention be documented?

#### In a fact file ([`.dust/facts/`](../facts))

Aligns with how other design decisions are recorded in this project.

#### In a comment in `wire.ts`

Co-located with the top-level handler that enforces it. Easy to find when working on the entry point.

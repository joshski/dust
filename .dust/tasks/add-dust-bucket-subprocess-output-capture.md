# Add `dust bucket` subprocess output capture

Implement output capture from dust subprocess invocations to enable the log buffer for the terminal UI.

## Requirements

1. Capture stdout/stderr from each Claude subprocess invocation
2. Buffer logs per repository using a fixed-size ring buffer (5000 lines, trim to 3000 when full)
3. Parse JSON-per-line output from Claude's `--output-format stream-json`
4. Tag each log line with stream type (stdout/stderr) and timestamp
5. Make logs available for the terminal UI to display

## Implementation Notes

- Follow the pattern in `lib/claude/spawn-claude-code.ts` for parsing Claude's JSON output
- Use `dangerouslySkipPermissions: true` for unattended Claude invocations (bucket workers run in sandboxes)
- Log subprocess crashes and continue to next iteration (don't stop the loop)
- Support graceful shutdown: send SIGTERM and wait for Claude processes to finish

## Log Line Format

```typescript
type LogLine = {
  text: string
  stream: 'stdout' | 'stderr'
  timestamp: number
}
```

## Testing

- Unit tests for ring buffer behavior (overflow, trimming)
- Test output parsing from subprocess
- Test error handling on subprocess crash

## Goals

- [Dependency Injection](../goals/dependency-injection.md)
- [Unit Test Coverage](../goals/unit-test-coverage.md)
- [Agent Autonomy](../goals/agent-autonomy.md)

## Blocked By

(none)

## Definition of Done

- [ ] Subprocess stdout/stderr captured and stored in per-repo log buffers
- [ ] Ring buffer limits memory usage (5000 lines max)
- [ ] Claude JSON output is parsed correctly
- [ ] Subprocess crashes logged and handled gracefully
- [ ] Unit tests cover buffer management and output parsing

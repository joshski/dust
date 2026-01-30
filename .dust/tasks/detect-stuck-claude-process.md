# Detect stuck Claude process in dust loop

When running `dust loop claude`, detect when Claude Code is "stuck" and not responding (no tokens received for some time). In this case, kill the Claude process and start a new one with `--continue` to resume the session.

## Problem

Claude Code can sometimes become unresponsive during a session, producing no output for an extended period. Currently, `dust loop claude` has no mechanism to detect this condition, leaving the loop stalled indefinitely.

## Solution

Add timeout detection to the Claude event streaming:

1. Track the timestamp of the last received event/token
2. If no events are received for a configurable timeout period (e.g., 60-120 seconds), consider the process stuck
3. Kill the stuck Claude process
4. Restart Claude with `--continue` flag to resume the session from where it left off
5. Continue the loop normally

## Implementation approach

The detection logic should be added to the event streaming layer. Options include:

### Option A: Wrapper in `lib/claude/run.ts`
Add a timeout wrapper around `streamEvents()` that monitors for activity and can kill/restart the process.

### Option B: Modify `lib/claude/spawn-claude-code.ts`
Add timeout logic to the generator that tracks time between events and yields a special timeout event or throws.

### Option C: Loop-level timeout in `lib/cli/commands/loop.ts`
Add timeout handling at the loop level, wrapping the `run()` call with timeout detection.

The implementation should:
- Capture the session ID from the initial run
- Pass the session ID to `--continue` on restart
- Optionally limit the number of restart attempts to prevent infinite restart loops
- Log when a timeout/restart occurs for debugging

## Relevant files

- `lib/cli/commands/loop.ts` - main loop logic
- `lib/claude/run.ts` - Claude runner
- `lib/claude/spawn-claude-code.ts` - spawns Claude process and streams events
- `lib/claude/streamer.ts` - event streaming logic

## Goals

- [Agent autonomy](../goals/agent-autonomy.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- [ ] Stuck process detection implemented with configurable timeout
- [ ] Stuck Claude process is automatically killed
- [ ] New Claude process started with `--continue` flag using the session ID
- [ ] Restart attempts are limited to prevent infinite loops
- [ ] Timeout/restart events are logged
- [ ] Tests cover the timeout detection and restart logic
- [ ] `bin/dust check` passes

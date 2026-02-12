# Kill inactive process in dust loop claude

When a `dust loop claude` process has not emitted any events for some time, kill it, `git reset --hard`, and try again.

## Context

The `dust loop claude` command runs Claude Code repeatedly to complete tasks autonomously. Each iteration spawns a Claude process via `lib/claude/run.ts`, which streams events through `lib/claude/streamer.ts`. The loop tracks events through the `onRawEvent` callback, which emits `claude.raw_event` events for each piece of output from Claude.

Occasionally, a Claude process may become unresponsive — stuck waiting for something that will never happen, or in an infinite loop that produces no output. In these cases, the loop hangs indefinitely. The process consumes resources without making progress, and the task remains incomplete.

This idea proposes detecting inactivity by monitoring the time since the last event. If no events arrive within a configurable timeout, the system would:

1. Kill the stuck Claude process
2. Run `git reset --hard` to discard any partial changes
3. Retry the iteration (or move on, depending on retry policy)

This aligns with the [Stop the Line](../goals/stop-the-line.md) goal — detecting a problem early and taking corrective action rather than letting it persist.

## Implementation Considerations

The inactivity timeout could be implemented in several places:

- **In `spawnClaudeCode`** — Track time since last yielded event, kill the subprocess if timeout exceeded
- **In `streamEvents`** — Wrap the event iteration with timeout logic
- **In `runOneIteration`** — Add a higher-level timeout around the entire `run()` call

The `git reset --hard` step is aggressive but appropriate for a sandboxed environment. Since `dust loop claude` is designed to run in isolation (per [Autonomous Agents Need Sandboxes](../facts/autonomous-agents-need-sandboxes.md)), discarding uncommitted changes is safe. Committed-but-not-pushed changes would need different handling.

## Open Questions

### What should the inactivity timeout be?

#### Fixed default timeout (e.g. 5 minutes)

A single hardcoded timeout that applies to all iterations. Simple to implement and reason about. The risk is that some legitimate operations (large file reads, complex tool invocations) may take longer than the default, causing false positives. Conversely, 5 minutes of silence is a long time to wait for a truly stuck process.

#### Configurable via settings.json

Add a `loopInactivityTimeoutMs` setting that users can tune per-project. This accommodates different workloads — a project with heavy compilation might need a longer timeout, while a simple documentation project could use a shorter one. The cost is configuration complexity and another setting to document.

#### Adaptive based on recent activity

Track how long between events in normal operation and adjust the timeout dynamically. If Claude typically emits events every few seconds, a 30-second gap is suspicious; if it typically goes 60 seconds between tool results, that same gap is normal. This is sophisticated but complex to implement correctly and may behave unpredictably.

### Should there be a retry limit before giving up on a task?

#### Single retry

Kill the process, reset, and try once more. If the retry also times out, mark the iteration as failed and move to the next task. This gives the task a second chance (maybe the first attempt hit a transient issue) without risking infinite retry loops.

#### No retry, move on immediately

A timeout is treated as a hard failure. The loop moves to the next iteration without retrying. This is simpler and avoids burning time on a task that may be fundamentally problematic. The downside is that a transient issue (network hiccup, temporary resource exhaustion) causes immediate failure rather than recovery.

#### Configurable retry count

Add a setting for how many times to retry before giving up. This gives users control but adds configuration surface. Most users probably want either 0 or 1 retries; values like 5 or 10 are unlikely to be useful and just delay failure.

### What counts as "inactivity"?

#### No events of any kind

Any event from Claude (text output, tool use, tool result, etc.) resets the inactivity timer. This is the simplest definition and catches the case where Claude is completely stuck. However, some events are more meaningful than others — a single `text_delta` with one character is technically activity but may not indicate real progress.

#### No substantive events

Only certain event types (e.g., `tool_use`, `tool_result`, `result`) reset the timer. Partial text deltas don't count because they might just be Claude "typing" without making progress on the actual task. This is harder to define precisely and may still miss cases where Claude is stuck mid-thought.

#### No forward progress (semantic)

Try to detect whether Claude is making actual progress toward completing the task, not just emitting output. This would require understanding what the output means, which is impractical. Stick with syntactic definitions.

### How should the timeout interact with the eventsUrl webhook?

#### Emit a timeout event

When a timeout occurs, emit a new event type like `claude.timeout` or `loop.inactivity_timeout` so external systems can track timeouts separately from normal completions or errors. This provides visibility into how often timeouts happen and may help diagnose systemic issues.

#### Treat as a normal error

Use the existing `claude.ended` event with `success: false` and an error message indicating timeout. This keeps the event schema simpler but loses the distinction between "Claude failed" and "Claude got stuck." External systems would need to parse the error message to differentiate.

### What if there are uncommitted changes from a previous tool invocation?

#### Always `git reset --hard`

Discard all uncommitted changes regardless of source. This is simple and ensures a clean slate, but may lose useful partial work if Claude made some progress before getting stuck.

#### Check for meaningful changes first

Before resetting, inspect what would be discarded. If the changes look like partial task progress (e.g., new files matching the task description), log them or save them somewhere before resetting. This adds complexity and requires judgment about what "meaningful" means.

#### Stash instead of reset

Run `git stash` instead of `git reset --hard`, preserving the changes for potential recovery. This is safer but accumulates stashes over time and doesn't actually clean the working directory of untracked files. A `git reset --hard && git clean -fd` may be more appropriate.

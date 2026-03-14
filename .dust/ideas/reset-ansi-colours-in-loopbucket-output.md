# Reset ANSI colours in loop/bucket output

Agent output may include ANSI colour codes without a reset sequence, causing subsequent system output to render in unexpected colours. This "colour poisoning" persists until something emits a reset code.

## Context

The codebase already has comprehensive ANSI colour handling:

- [[`lib/cli/colors.ts`](../../lib/cli/colors.ts)](../../lib/cli/colors.ts) defines colour codes and the reset sequence (`\x1b[0m`)
- [[`lib/bucket/terminal-ui.ts`](../../lib/bucket/terminal-ui.ts)](../../lib/bucket/terminal-ui.ts) uses `ANSI.RESET` consistently when rendering its own UI elements

However, agent output (the actual responses from Claude or other agents) passes through without sanitisation. If an agent outputs something like `\x1b[31mError: something failed` without a closing reset, all subsequent text renders in red.

## Affected Code Paths

**Loop command ([`lib/cli/commands/loop.ts`](../../lib/cli/commands/loop.ts)):**
- `formatLoopEvent()` returns formatted strings that get written to stdout
- Agent output is streamed directly to stdout via the `run` function

**Bucket repository loop ([[`lib/bucket/repository-loop.ts`](../../lib/bucket/repository-loop.ts)](../../lib/bucket/repository-loop.ts)):**
- `createStdoutSink()` captures agent output and appends it to the log buffer
- `onLoopEvent` and `onAgentEvent` format and append system messages to the log buffer

**Terminal UI ([[`lib/bucket/terminal-ui.ts`](../../lib/bucket/terminal-ui.ts)](../../lib/bucket/terminal-ui.ts)):**
- `formatLogLine()` renders log lines for display
- Already applies `ANSI.RESET` after its own formatting, but doesn't neutralise colours that may be present in the log line content

## Implementation Considerations

There are several places where a reset could be injected:

1. **After each agent output line** - Reset at the end of every line captured from agent output
2. **Before each system message** - Prepend reset to loop/agent event messages
3. **At the boundary between agent and system output** - Reset when switching from agent output to formatted system messages
4. **In the terminal UI render** - Strip or reset colours in log line content before display

Option 1 would add overhead to every line but guarantees no leakage. Option 2 is more targeted but requires identifying when we're about to emit a system message after agent content. Option 3 is similar but tracks state transitions. Option 4 only helps the bucket terminal UI, not the direct stdout path in `dust loop`.

## Related Code

- [[`lib/bucket/terminal-ui.ts:25`](../../lib/bucket/terminal-ui.ts)](../../lib/bucket/terminal-ui.ts) - `ANSI.RESET` constant
- [[`lib/cli/colors.ts:18`](../../lib/cli/colors.ts)](../../lib/cli/colors.ts) - `reset: '\x1b[0m'` in colour definitions
- [[`lib/bucket/repository-loop.ts:76-103`](../../lib/bucket/repository-loop.ts)](../../lib/bucket/repository-loop.ts) - `createStdoutSink` that captures agent output
- [`lib/cli/commands/loop.ts:132-155`](../../lib/cli/commands/loop.ts) - `formatLoopEvent` that formats system messages

## Open Questions

### Where should the reset be applied?

#### After each agent output line
Append `\x1b[0m` to every line captured from agent output before storing in the log buffer. This guarantees no colour leakage but adds a reset code to every line, even ones that don't contain colours.

#### Before each system message
Prepend `\x1b[0m` to each formatted loop event and agent event message. This is more surgical but requires ensuring all output paths go through these formatters.

#### Both
Reset both after agent lines and before system messages for belt-and-suspenders safety. The overhead of extra reset codes is negligible.

### Should we strip ANSI codes from agent output entirely?

#### Preserve agent colours
Keep agent colour codes intact so their output displays as intended. Only add resets at boundaries to prevent leakage.

#### Strip all ANSI from agent output
Remove all ANSI escape sequences from agent output. This eliminates the colour poisoning problem entirely but loses potentially useful formatting (e.g., coloured diff output, syntax highlighting).

#### Make it configurable
Add a setting to choose between preserving or stripping agent colours. This adds complexity but accommodates different preferences.

### Should the bucket terminal UI handle this differently than the direct stdout path?

#### Unified approach
Apply the same reset strategy in both `dust loop` (direct stdout) and `dust bucket` (log buffer + terminal UI). This keeps behaviour consistent.

#### Terminal UI can be stricter
The terminal UI could strip ANSI codes from log line content since it applies its own formatting. The direct stdout path might preserve colours since users may value them there.

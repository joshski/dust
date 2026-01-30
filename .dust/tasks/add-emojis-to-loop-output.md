# Add emojis to dust loop claude output

The `dust loop claude` command currently outputs plain text messages that feel somewhat dry. Adding emojis would make the output more fun and engaging, similar to how other dust commands already use emojis (e.g., `dust list goals` shows the target emoji).

## Current State

The output messages in `lib/cli/commands/loop.ts` include:

- "WARNING: This command skips all permission checks..." (line 146)
- "Starting dust loop claude (max N iterations)..." (line 150)
- "Press Ctrl+C to stop" (line 152)
- "Syncing with remote..." (line 91)
- "Checking for available tasks..." (line 98)
- "No tasks available. Sleeping..." (line 102)
- "Found task(s). Starting Claude..." (line 108)
- "Claude session complete. Continuing loop..." (line 114, 121)
- "Completed iteration N/M" (line 165)
- "Reached max iterations (N). Exiting." (line 171)

## Suggested Emoji Mapping

Some ideas for emoji additions:

- Warning message: Add a warning emoji
- Starting loop: Add a rocket or loop emoji
- Syncing: Add a sync/refresh emoji
- Checking tasks: Add a magnifying glass emoji
- No tasks/sleeping: Add a sleep emoji
- Found tasks: Add a checkmark or sparkle emoji
- Starting Claude: Add a robot emoji
- Session complete: Add a completion emoji
- Iteration counter: Add a counter or progress emoji
- Max iterations reached: Add a finish flag emoji

## Files to Modify

- `lib/cli/commands/loop.ts` - Main implementation with all output messages
- `lib/cli/commands/loop.test.ts` - Update test expectations to match new output

## Goals

(none directly applicable - this is a quality of life improvement)

## Blocked by

(none)

## Definition of done

- [ ] All user-facing output messages in `loop.ts` include appropriate emojis
- [ ] Emoji choices are consistent with existing dust command output style
- [ ] Tests in `loop.test.ts` are updated to match new output
- [ ] All tests pass

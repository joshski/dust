# Improve loop output formatting

The `dust loop claude` command output has several formatting issues that make it harder to read. Improvements needed:

1. Remove indentation from tool output (bash commands, todo lists, etc.)
2. Show actual tool result content instead of just "Result (X chars)"
3. Remove the checkmark emoji from result lines

## Current behavior

In `lib/claude/tool-formatters.ts`, lines are prefixed with `   ` (3 spaces) for indentation. For example in `formatBash` at line 100:
```typescript
lines.push(`   $ ${command}`)
```

In `lib/claude/streamer.ts:52`, tool results show only character count:
```typescript
sink.line(`✅ Result (${event.content.length} chars)`)
```

## Desired behavior

1. Remove all `   ` indentation prefixes from tool-formatters.ts
2. Show the actual result content with a visual separator, something like:
```
Result:
────────────────────────────────
<actual content>
────────────────────────────────
```
3. No emoji on the result line

## Files to modify

- `lib/claude/tool-formatters.ts` - Remove `   ` prefix from all output lines
- `lib/claude/streamer.ts` - Update `tool_result` handling to show actual content

## Goals

(none)

## Blocked by

(none)

## Definition of done

- [ ] Tool output lines (bash commands, file content, todo items, etc.) are not indented
- [ ] Tool results show actual content with a clear visual separator
- [ ] No checkmark emoji on result lines
- [ ] All checks pass (`bin/dust check`)

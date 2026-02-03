# Tool-Specific Output Rendering

When `dust loop claude` displays tool invocations, it currently renders the JSON arguments directly. This task adds human-friendly rendering for each tool type, making it easier to follow what Claude is doing.

## Current Behavior

In `lib/claude/streamer.ts`, tool use is rendered like this:

```
🔧 Tool: Write
   Input: {
     "file_path": "/path/to/file.txt",
     "content": "full content here..."
   }
```

## Desired Behavior

Each tool should have a custom renderer that presents its arguments in a human-readable format. The output should:

1. Show a clear description of what the tool does
2. Display all argument values in full (never truncate content)
3. Group any unrecognized arguments at the end, labeled separately

### Example Output Formats

**Write tool:**
```
🔧 Write: /path/to/file.txt
   ────────────────────────────
   full content here...
   ────────────────────────────
```

**Edit tool:**
```
🔧 Edit: /path/to/file.ts
   Replace:
   ────────────────────────────
   old code here
   ────────────────────────────
   With:
   ────────────────────────────
   new code here
   ────────────────────────────
```

**Bash tool:**
```
🔧 Bash: List files in directory
   $ ls -la /path/to/dir
```

**Read tool:**
```
🔧 Read: /path/to/file.ts (lines 10-50)
```

**TodoWrite tool:**
```
🔧 TodoWrite: 3 items
   ☐ First task
   ☐ Second task
   ☑ Completed task
```

**Unknown/unrecognized arguments:**
```
🔧 SomeTool: ...
   ... (normal formatted output)

   (Other arguments: {"unknownField": "value"})
```

## Implementation Notes

- Add a new file `lib/claude/tool-formatters.ts` with individual formatter functions
- Each formatter should take a `Record<string, unknown>` and return formatted lines
- The main formatter should delegate to tool-specific formatters, falling back to JSON for unknown tools
- Ensure test coverage for each formatter
- Update `lib/claude/streamer.ts` to use the new formatters
- Update `lib/claude/streamer.test.ts` to verify the new output format

## Goals

- [Human-AI Collaboration](../goals/human-ai-collaboration.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- [ ] `lib/claude/tool-formatters.ts` exists with formatters for: Write, Edit, Read, Bash, TodoWrite, Grep, Glob, Task
- [ ] Each formatter displays all arguments (nothing omitted or truncated)
- [ ] Unrecognized arguments are displayed separately at the end of each tool's output
- [ ] Unknown tools fall back to JSON rendering (current behavior)
- [ ] Unit tests exist for each tool formatter
- [ ] `lib/claude/streamer.ts` uses the new formatters
- [ ] All existing tests pass
- [ ] Manual testing with `dust loop claude` confirms human-readable output

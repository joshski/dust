# Improve dust init Message

Make the `dust init` output more human-friendly with colors and emojis.

## Background

The current `dust init` command outputs plain text messages like:

```
Initialized Dust repository in .dust/
Created directories: goals, ideas, tasks, facts, config
Created initial fact: .dust/facts/use-dust-for-planning.md
```

This output should be visually enhanced with colors and emojis to make it more welcoming and easier to scan for humans, similar to how `dust list` formats its output.

## Implementation Details

Update `lib/cli/commands/init.ts` to use:

1. **Emojis** for visual landmarks:
   - Folder/directory operations
   - File creation confirmations
   - Success indicators
   - Next steps suggestions

2. **ANSI colors** for emphasis:
   - Bold for headings and important items
   - Dim for secondary information
   - Cyan for file paths
   - Green for success messages

Follow the existing pattern established in `lib/cli/commands/list.ts` which defines a `colors` object with ANSI escape codes.

## Goals

- [Easy Adoption](../goals/easy-adoption.md)
- [Human-AI Collaboration](../goals/human-ai-collaboration.md)

## Blocked by

(none)

## Definition of done

- [ ] `dust init` output uses emojis to visually distinguish different types of messages
- [ ] `dust init` output uses ANSI colors for emphasis and readability
- [ ] Output remains readable when colors are disabled (respects NO_COLOR when that task is complete)
- [ ] Visual style is consistent with other dust commands like `dust list`

# Improve Dust Help Formatting

The `dust help` command displays available commands with their descriptions, but there is excessive whitespace between the command names and their descriptions. This makes the output less readable and harder to scan.

## Current State

In `lib/templates/help.txt`, all command descriptions are aligned at column 26, regardless of command name length. This creates large gaps for short commands like `init`, `help`, `check`, etc.

```
  init                      Initialize a new Dust repository
  help                      Show this help message
```

## Desired State

Reduce the alignment column so descriptions start closer to the command names. Use a consistent 2-space gap after the longest command name (`understand goals` at 16 characters), which means aligning descriptions at column 20 instead of 26:

```
  init              Initialize a new Dust repository
  help              Show this help message
```

## Files to Modify

- `lib/templates/help.txt` - Adjust spacing in the Commands section

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md)

## Blocked by

(none)

## Definition of done

- [ ] Command descriptions in `lib/templates/help.txt` are aligned with reduced spacing
- [ ] The output of `bin/dust help` is more compact and readable
- [ ] No other formatting changes are introduced

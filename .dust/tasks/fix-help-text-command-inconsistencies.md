# Fix help text command inconsistencies

The help text in `lib/templates/help.txt` shows command names that don't match the actual command syntax.

## Problems

1. **`pre-push`** - Help shows `pre-push` (with hyphen) but the actual command is `pre push` (with space)
2. **`loop`** - Help shows `loop` but the actual command is `loop claude`

Both issues cause users to get "Unknown command" errors when following the help documentation.

## Goals

[Context Window Efficiency](../goals/context-window-efficiency.md)

## Blocked by

(none)

## Definition of done

- [ ] Help text matches actual command syntax for `pre push`
- [ ] Help text matches actual command syntax for `loop claude`
- [ ] Running `bin/dust pre-push` and `bin/dust loop` either works or shows helpful error messages

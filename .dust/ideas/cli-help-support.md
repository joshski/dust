# CLI Help Support

Support common patterns for getting help in the CLI.

Examples:

- `dust help idea` - show help for the idea command
- `dust loop claude --help` - show help with a trailing flag
- `dust idea -h` - show help with a short flag

This would make the CLI more discoverable and user-friendly by following conventions that users expect from command-line tools.

## Current State

Global help already works for these cases:

- `dust` (no args) — shows help
- `dust help` — shows help
- `dust --help` — shows help
- `dust -h` — shows help

What does NOT work:

- `dust help <command>` — `help` is resolved as the command, remaining args are ignored
- `dust <command> --help` — `--help` is passed as a remaining arg, ignored by the handler
- `dust <command> -h` — same, `-h` is ignored

## Proposal

Intercept `--help` and `-h` in `main()` after command resolution but before dispatch. If the remaining arguments contain a help flag, show help instead of running the command. Also handle `dust help <command>` by treating the rest of the args after `help` as a command lookup.

### Per-command help content

Each command already has a one-line description in `help.txt`. Per-command help could show:

- The one-line description (already exists in the help template)
- Usage pattern (e.g., `dust list [type]`)
- Brief explanation of what the command does

This content could come from a per-command help template (e.g., `lib/templates/help-init.txt`) or from a metadata object in the command registry. Templates are consistent with the existing pattern and keep prose out of code.

### Changes needed

1. **`main.ts`**: After `resolveCommand()`, check if `remaining` contains `--help` or `-h`. If so, show per-command help instead of dispatching.
2. **`main.ts`**: When the first arg is `help`, treat the rest as a command lookup (e.g., `dust help new task` → look up `new task` and show its help).
3. **Per-command help templates or metadata**: Add help content for each command. Templates are the lightest-weight approach and match existing patterns.
4. **Fallback**: If a command has no per-command help, show the global help text (graceful degradation).
5. **Tests**: Add cases for `dust <command> --help`, `dust help <command>`, and multi-word commands like `dust help new task`.

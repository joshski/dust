# Disable Output Colors

Disable ANSI color codes in task output for environments that don't need or support them (e.g., non-interactive agents, Claude Code web).

## Background

The current dust CLI uses ANSI escape codes for colored output, which works well in interactive terminals. However, these escape codes appear as raw characters (e.g., `[0m`, `[36m`) in environments that don't interpret them, such as:

- Claude Code running in web mode
- Non-interactive agent pipelines
- Environments with `NO_COLOR` set
- Output being piped to files or other programs

## Implementation Details

Consider implementing color detection using one or more of:

1. Check for `NO_COLOR` environment variable (follows [no-color.org](https://no-color.org) standard)
2. Check for `TERM=dumb` environment variable
3. Check `process.stdout.isTTY` to detect non-interactive terminals
4. Add a `--no-color` CLI flag for explicit control

Update all output functions that emit ANSI codes to respect these settings.

## Goals

- [Agent Agnostic](../goals/agent-agnostic.md)
- [Agent Autonomy](../goals/agent-autonomy.md)

## Blocked by

(none)

## Definition of done

- [ ] Dust respects `NO_COLOR` environment variable
- [ ] Dust detects non-TTY environments and disables colors automatically
- [ ] Output is readable in Claude Code web and other non-interactive contexts
- [ ] Tests verify color-stripping behavior

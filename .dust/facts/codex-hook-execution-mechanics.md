# Codex Hook Execution Mechanics

How Codex 0.125.0 spawns and runs hook commands configured under `[[hooks.<EventName>]]` in `.codex/config.toml`.

## Spawn

Codex spawns the hook via `$SHELL -lc <command>`, with `cwd` set to Codex's working directory. Stdin, stdout, and stderr are piped — Codex writes the event JSON to stdin and reads the response JSON from stdout.

## Sandbox

Hooks run inside Codex's sandbox. The default `read-only` mode blocks file writes — easy to mistake a sandbox-blocked hook for "the hook didn't fire". Hooks can read stdin and write stdout regardless of sandbox mode.

## Environments Where Hooks Fire

Hooks fire under non-interactive `codex exec` as well as the interactive TUI. This makes hooks usable for both workflows.

## Exit Codes

- `0` — success.
- `2` — blocking error (only meaningful for events that support blocking, such as `UserPromptSubmit` and `PreToolUse`; the reason should be on stderr).
- Other non-zero — generic failure.

Commands like `dust codex hook` should avoid exit code `2` for parse/validation errors, since `2` carries blocking semantics in the protocol.

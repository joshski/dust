# Codex Environment Variables

Codex 0.125.0 sets environment variables on subprocesses inconsistently across code paths.

## Hook Subprocesses

Codex sets **no** env vars on hook subprocesses. `codex-rs/hooks/src/engine/command_runner.rs` does not call `.env(...)`; hooks inherit the Codex parent process's env unchanged. There is no `CODEX_HOME`, `CODEX_CI`, or `CODEX_THREAD_ID` available to a hook command.

This means `lib/agents/detection.ts` cannot identify a Codex environment from a hook subprocess — it falls through to `unknown`, or worse, reports a leaked `CLAUDECODE=1` from the parent shell. Codex-specific entry points (e.g. `dust codex hook`) should treat the entry point itself as the "running under Codex" signal rather than calling `detectAgent`.

## Shell-Tool Subprocesses

For comparison, Codex *does* set `CODEX_CI=1` and `CODEX_THREAD_ID=<uuid>` on **shell-tool** subprocesses — a different code path from hooks.

## Implication for Detection

Detection code that relies on `CODEX_HOME` or `CODEX_CI` works for shell-tool subprocesses but not for hook subprocesses. Updating `lib/agents/detection.ts` to read stdin would be a much larger change with implications for every other dust command, so the preferred fix is to use a dedicated entry point per agent context.

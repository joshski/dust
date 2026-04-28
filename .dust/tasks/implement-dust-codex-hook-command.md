# Implement `dust codex hook` command

Add a `dust codex hook` dispatcher command that consumes Codex hook events on stdin and injects dust instructions into the session's model context.

## Background and Motivation

Codex 0.125.0+ supports hooks (stable feature `codex_hooks`). A hook is an external command Codex spawns at well-defined session events; the command receives a JSON payload on stdin and may emit a JSON payload on stdout that Codex consumes.

Two reasons to move dust's Codex bootstrapping from the `AGENTS.md`-instruction approach to a Codex-native hook:

1. **Token / latency efficiency** — under the current approach Codex re-runs `bunx dust agent` many times per session whenever it follows the `AGENTS.md` instruction. A `SessionStart` hook runs once per session.
2. **Proper context injection** — the hook output's `hookSpecificOutput.additionalContext` lands directly in the model's session context (verified end-to-end against codex 0.125.0: a marker placed only in `additionalContext` was recallable by the model), instead of being written to stdout where the user sees it but the model may not.

Additional problem fixed by going through a hook command: the existing `bin/dust agent` invoked from a Codex `SessionStart` hook is *not* detected as Codex by `lib/agents/detection.ts`, because Codex strips its own env vars from hook subprocesses (see "Hook execution mechanics" below). A dedicated `dust codex hook` command knows it's Codex by virtue of being the codex hook entry point — no env-sniffing needed.

## User-facing target config

Users (e.g. `lustbucket/.codex/config.toml`) replace `bunx dust agent` with `bunx dust codex hook`:

```toml
[features]
codex_hooks = true

[[hooks.SessionStart]]
matcher = "^startup$"

[[hooks.SessionStart.hooks]]
type = "command"
command = "bunx dust codex hook"
statusMessage = "Loading dust agent instructions"
```

## Why a dispatcher (one command, branches on `hook_event_name`)

A single `dust codex hook` command that reads `hook_event_name` from stdin and dispatches per event keeps the user's `.codex/config.toml` simple and lets us add per-event behavior later (e.g. on `UserPromptSubmit` or `Stop`) without asking users to update their config. Initial scope: `SessionStart` does the real work; other events return a no-op success response.

## Hook stdin/stdout contract (verified against codex 0.125.0)

All schemas below are extracted from JSON Schema definitions embedded in the codex 0.125.0 binary and verified by live probe against a `codex exec` run.

### `SessionStart` input (stdin)

```json
{
  "session_id": "019dd31c-9a73-7911-a2e4-e466c6bf7dad",
  "transcript_path": "/Users/josh/.codex/sessions/2026/04/28/rollout-...jsonl",
  "cwd": "/private/tmp/codex-env-probe",
  "hook_event_name": "SessionStart",
  "model": "gpt-5.5",
  "permission_mode": "bypassPermissions",
  "source": "startup"
}
```

All fields required. Enums:

- `permission_mode`: `default | acceptEdits | plan | dontAsk | bypassPermissions`
- `source`: `startup | resume | clear` (also what the config-side `matcher` regex tests against)
- `transcript_path`: nullable string (string or null)

### `SessionStart` output (stdout)

```json
{
  "continue": true,
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<dust agent instructions>"
  },
  "stopReason": null,
  "suppressOutput": false,
  "systemMessage": "dust agent loaded"
}
```

Output fields (all optional except `hookSpecificOutput.hookEventName` when `hookSpecificOutput` is present):

- `continue` (bool, default `true`) — set `false` to abort the session.
- `hookSpecificOutput.additionalContext` (string) — **this is the field that lands in the model context**.
- `hookSpecificOutput.hookEventName` — must be `"SessionStart"` when `hookSpecificOutput` is present.
- `stopReason` (string) — shown if `continue: false`.
- `suppressOutput` (bool) — hide the hook's stdout from the user-visible TUI/exec output.
- `systemMessage` (string) — short message Codex shows in TUI/exec output.

### Other event schemas (out of initial scope; dispatcher should accept and no-op)

All event names: `PreToolUse | PermissionRequest | PostToolUse | SessionStart | UserPromptSubmit | Stop`.

- **`UserPromptSubmit`** input adds `prompt` and `turn_id`. Output supports `hookSpecificOutput.additionalContext`, plus `decision: "block"` + `reason` to refuse the prompt.
- **`PreToolUse`** input adds `tool_name`, `tool_input`, `tool_use_id`. Output: `permissionDecision: allow|deny|ask` with `permissionDecisionReason`, plus `updatedInput` to rewrite arguments.
- **`PostToolUse`** input adds `tool_response`, `updatedMCPToolOutput`.
- **`Stop`** input adds `last_assistant_message`, `stop_hook_active`. Output can `decision: "block"` to keep the model going.
- **`PermissionRequest`** ask-flow approval hook: `approve | block | ask`.

## Hook execution mechanics (verified)

- Codex spawns the hook via `$SHELL -lc <command>`, with `cwd` set to Codex's working directory, stdin piped (the JSON above), stdout/stderr piped.
- **Codex sets NO env vars on hook subprocesses.** `codex-rs/hooks/src/engine/command_runner.rs` does not call `.env(...)`; hooks inherit the Codex parent process's env unchanged. There is no `CODEX_HOME`, `CODEX_CI`, or `CODEX_THREAD_ID` for hook commands. (For comparison, Codex *does* set `CODEX_CI=1` and `CODEX_THREAD_ID=<uuid>` on **shell-tool** subprocesses — a different code path.) This is why `lib/agents/detection.ts` falls through to `unknown` (or worse, sees a leaked `CLAUDECODE=1` from the parent shell) when invoked via a Codex hook.
- Hooks run inside Codex's sandbox. Default `read-only` blocks file writes — easy to mistake a sandbox-blocked hook for "the hook didn't fire". Hooks can read stdin and write stdout regardless.
- Hooks fire under non-interactive `codex exec` too, not only the TUI.
- Exit codes: `0` = success; `2` = blocking error (events that support blocking expect the reason on stderr); other non-zero = generic failure.

## Detection implications

This task does **not** need to update `lib/agents/detection.ts`. The presence of valid hook JSON on stdin under the `dust codex hook` entry point is itself the "running under codex" signal — `dust codex hook` does not need to call `detectAgent`. (Updating `detection.ts` to read stdin would be a separate, larger change with implications for every other dust command.)

## Capture findings as dust facts

During or after implementation, capture the following as dust facts (run `bin/dust new fact` for each — facts are durable knowledge in `.dust/facts/` so future agents picking up codex-related work don't have to re-derive any of this from the codex binary):

- **Codex hook protocol** — the input/output schemas above (one fact per event family is fine, or one combined fact), plus the matcher/event-name relationship.
- **Codex hook execution mechanics** — `$SHELL -lc` spawn, sandbox interaction, exit-code semantics, the fact that hooks fire under `codex exec`.
- **Codex environment variables** — Codex does not set env vars on hook subprocesses, but does set `CODEX_CI=1` and `CODEX_THREAD_ID` on shell-tool subprocesses. Note the implication for `lib/agents/detection.ts`.
- **`codex_hooks` feature flag** — that it is stable as of codex 0.125.0 and required in `[features]` for hooks to fire.

## Implementation outline

1. **Register the command** in `lib/cli/main.ts` alongside other multi-word commands (e.g. `'codex hook': codexHook`). Backed by a new module `lib/cli/commands/codex-hook.ts`.
2. **Read stdin as JSON** through an injected dependency (do not import `process.stdin` directly — pass a stdin reader through `CommandDependencies` or the codex-hook module's own dependency object so unit tests can supply fixtures).
3. **Validate `hook_event_name`** against the known set. Dispatch to a per-event handler.
4. **`SessionStart` handler** — generate the dust agent instructions (reuse the same content `dust agent` produces; consider extracting that text into a shared helper) and emit the `SessionStart` output JSON with `hookSpecificOutput.additionalContext` set. Optionally set `systemMessage` to a short "dust agent loaded" string.
5. **Other known events** — emit `{}` (or a payload with only `continue: true`) and exit 0. Adding richer behavior is a future task.
6. **Unknown / malformed input** — write a clear error to stderr and exit non-zero (use a non-2 code; `2` has blocking semantics in the hook protocol).
7. **Tests** — `lib/cli/commands/codex-hook.test.ts`, fixture-driven: feed stdin payloads and assert exact stdout JSON shape and exit code for each branch (SessionStart success, each known event no-op, malformed JSON, unknown `hook_event_name`).
8. **Documentation** — add the recommended `.codex/config.toml` snippet to README / `dust init` output where relevant.

## Task Type

implement

## Principles

- [Agent-Specific Enhancement](../principles/agent-specific-enhancement.md)
- [Agent-Agnostic Design](../principles/agent-agnostic-design.md)
- [Context Window Efficiency](../principles/context-window-efficiency.md)
- [Easy Adoption](../principles/easy-adoption.md)
- [Dependency Injection](../principles/dependency-injection.md)
- [Co-located Tests](../principles/co-located-tests.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)
- [Small Units](../principles/small-units.md)

## Blocked By

(none)

## Definition of Done

- `dust codex hook` command exists and is registered in `lib/cli/main.ts`
- Reads JSON from stdin via an injected dependency (testable without touching `process.stdin`)
- Dispatches by `hook_event_name`; unknown values produce a clear stderr message and non-zero (non-2) exit
- `SessionStart` handler emits valid hook output JSON with `hookSpecificOutput.additionalContext` containing the dust agent instructions
- Non-`SessionStart` known events return a no-op success response (exit 0, valid JSON)
- Unit tests in `lib/cli/commands/codex-hook.test.ts` cover: SessionStart success, each known event no-op, malformed JSON, unknown event name
- End-to-end smoke against real codex confirms `additionalContext` reaches the model
- Codex hook protocol, execution mechanics, env var behavior, and `codex_hooks` feature flag captured as dust facts in `.dust/facts/`
- README or `dust init` output references the recommended `.codex/config.toml` snippet
- `bin/dust lint` passes

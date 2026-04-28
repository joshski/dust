# Codex Hook Protocol

Codex 0.125.0+ supports hooks under the stable `codex_hooks` feature flag. Hooks must be enabled in `~/.codex/config.toml` before they fire:

```toml
[features]
codex_hooks = true
```

A hook is an external command Codex spawns at a well-defined session event. The command receives a JSON payload on stdin and may emit a JSON payload on stdout that Codex consumes.

## Event Names and Matchers

The known `hook_event_name` values are: `PreToolUse`, `PermissionRequest`, `PostToolUse`, `SessionStart`, `UserPromptSubmit`, `Stop`. Each hook block in config selects an event and (optionally) a `matcher` regex. For `SessionStart`, `matcher` tests against the `source` field (`startup | resume | clear`).

## SessionStart Payloads

Input on stdin (all fields required, `transcript_path` may be null):

```json
{
  "session_id": "...",
  "transcript_path": "...",
  "cwd": "...",
  "hook_event_name": "SessionStart",
  "model": "...",
  "permission_mode": "default | acceptEdits | plan | dontAsk | bypassPermissions",
  "source": "startup | resume | clear"
}
```

Output on stdout:

```json
{
  "continue": true,
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "..."
  },
  "stopReason": null,
  "suppressOutput": false,
  "systemMessage": "..."
}
```

The `hookSpecificOutput.additionalContext` field lands directly in the model's session context — verified end-to-end against codex 0.125.0. This makes `SessionStart` the right place to inject one-shot instructions, in contrast to writing to stdout (which the user sees but the model may not).

## Other Events (Brief)

- `UserPromptSubmit` adds `prompt`, `turn_id`. Output supports `additionalContext` plus `decision: "block"` + `reason`.
- `PreToolUse` adds `tool_name`, `tool_input`, `tool_use_id`. Output: `permissionDecision: allow | deny | ask` and `updatedInput`.
- `PostToolUse` adds `tool_response`, `updatedMCPToolOutput`.
- `Stop` adds `last_assistant_message`, `stop_hook_active`. Output can `decision: "block"` to keep the model going.
- `PermissionRequest` is the ask-flow approval hook: `approve | block | ask`.

These schemas are extracted from JSON Schema definitions embedded in the codex 0.125.0 binary and verified by live probe against `codex exec`.

# Agent-specific check hints

Currently, check hints in `settings.json` are shown to all agents when a check fails. Different agents have different capabilities and idioms, so the same hint isn't equally useful to every agent. For example, Claude Code Web agents can't install global tools, and Codex agents may need different fix commands than Claude Code.

Add support for agent-specific check hints so that projects can expose targeted guidance when checks fail, based on which agent is running.

## Design

Extend the `hints` field in `CheckConfig` to support both the current `string[]` format and a new keyed format where hints are mapped to agent types:

```json
{
  "name": "lint (biome)",
  "command": "bunx biome check .",
  "hints": {
    "*": ["Run `bunx biome check . --write` to auto-fix lint errors"],
    "claude-code-web": ["You cannot run --write in this environment, fix each error manually"],
    "codex": ["Use the sandbox shell to run biome with --write"]
  }
}
```

- `"*"` provides default hints shown to any agent (equivalent to the current `string[]` format)
- Agent-type keys (`"claude-code"`, `"claude-code-web"`, `"codex"`) provide overrides for specific agents
- When a specific agent key is present, its hints are shown **instead of** the `"*"` hints
- The plain `string[]` format remains supported for backwards compatibility

### Files to change

- **`lib/cli/types.ts`** - Update `CheckConfig.hints` type to accept both `string[]` and `Record<string, string[]>`. Add a type like `CheckHints = string[] | Record<string, string[]>`.
- **`lib/cli/commands/check.ts`** - Resolve hints at display time using the detected agent type. Import `detectAgent` from `lib/agents/detection.ts` and use it in `displayResults` (or resolve earlier in the pipeline). When hints is a `Record`, select the agent-specific key if present, otherwise fall back to `"*"`.
- **`lib/config/settings.ts`** - Ensure settings parsing accepts both hint formats without validation errors.
- **`lib/cli/commands/check.test.ts`** - Add tests for: plain `string[]` hints still work, `Record` hints select the correct agent, `"*"` fallback works, missing agent key falls back to `"*"`, no hints at all still works.

### Agent detection

Agent detection already exists in `lib/agents/detection.ts` with types `"claude-code"`, `"claude-code-web"`, `"codex"`, and `"unknown"`. The `check` command should call `detectAgent()` once and thread the agent type through to hint resolution.

## Goals

- [Agent-Specific Enhancement](../goals/agent-specific-enhancement.md)
- [Actionable Errors](../goals/actionable-errors.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked By

(none)

## Definition of Done

- [ ] `CheckConfig.hints` accepts both `string[]` and `Record<string, string[]>`
- [ ] When hints is a `Record`, the correct agent-specific hints are displayed based on `detectAgent()`
- [ ] When no agent-specific key matches, `"*"` hints are used as a fallback
- [ ] When hints is a plain `string[]`, behavior is unchanged from today
- [ ] When hints is a `Record` with no matching key and no `"*"`, no hints are shown
- [ ] Existing tests continue to pass
- [ ] New tests cover all hint resolution paths

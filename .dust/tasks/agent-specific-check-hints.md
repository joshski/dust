# Agent-specific check hints

Currently, check hints in `settings.json` are shown to all agents when a check fails. Different agents have different capabilities and idioms, so the same hint isn't equally useful to every agent. For example, Claude Code Web agents can't install global tools, and Codex agents may need different fix commands than Claude Code.

Add support for agent-specific check hints so that projects can expose targeted guidance when checks fail, based on which agent is running.

## Design

Each hint in the `hints` array can be either a plain string (shown to all agents) or an object with `agents` and `hint` fields (shown only to the listed agents):

```json
{
  "name": "lint (biome)",
  "command": "bunx biome check .",
  "hints": [
    "Check biome.json for rule configurations",
    { "agents": ["claude-code", "codex"], "hint": "Run `bunx biome check . --write` to auto-fix lint errors" },
    { "agents": ["claude-code-web"], "hint": "You cannot run --write in this environment, fix each error manually" }
  ]
}
```

- Plain strings are shown to every agent (unchanged from today)
- `{ "agents": [...], "hint": "..." }` objects are shown only when the detected agent type is in the `agents` list
- Both forms can be mixed freely in the same array

### Files to change

- **`lib/cli/types.ts`** - Update `CheckConfig.hints` type. Add a type like `type CheckHint = string | { agents: AgentType[]; hint: string }` and change `hints?: string[]` to `hints?: CheckHint[]`.
- **`lib/cli/commands/check.ts`** - Resolve hints at display time using the detected agent type. Import `detectAgent` from `lib/agents/detection.ts` and use it in `displayResults` (or resolve earlier in the pipeline). Filter hints: include plain strings unconditionally, include objects only when the current agent type appears in their `agents` list.
- **`lib/config/settings.ts`** - Ensure settings parsing accepts the mixed hint format without validation errors.
- **`lib/cli/commands/check.test.ts`** - Add tests for: plain string hints still work, object hints filter by agent type, mixed arrays resolve correctly, no hints at all still works.

### Agent detection

Agent detection already exists in `lib/agents/detection.ts` with types `"claude-code"`, `"claude-code-web"`, `"codex"`, and `"unknown"`. The `check` command should call `detectAgent()` once and thread the agent type through to hint resolution.

## Goals

- [Agent-Specific Enhancement](../goals/agent-specific-enhancement.md)
- [Actionable Errors](../goals/actionable-errors.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked By

(none)

## Definition of Done

- [ ] `CheckConfig.hints` accepts `Array<string | { agents, hint }>`
- [ ] Plain string hints are shown to all agents (unchanged from today)
- [ ] Object hints are shown only when the detected agent type is in the `agents` list
- [ ] Mixed arrays of strings and objects resolve correctly
- [ ] Existing tests continue to pass
- [ ] New tests cover all hint resolution paths

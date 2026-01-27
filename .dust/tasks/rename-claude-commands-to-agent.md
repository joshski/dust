# Rename claude-specific commands to agent

Rename all `dust claude` commands to `dust agent` to be more generic and framework-agnostic.

## Problem

The current command structure uses `dust claude` which ties the tooling to a specific AI provider. Renaming to `dust agent` makes the commands more generic and allows for potential future support of other AI coding agents.

## Files to rename

- `lib/cli/claude.ts` → `lib/cli/agent.ts`
- `lib/cli/claude.test.ts` → `lib/cli/agent.test.ts`
- `lib/templates/claude-greeting.txt` → `lib/templates/agent-greeting.txt`
- `lib/templates/claude-help.txt` → `lib/templates/agent-help.txt`
- `lib/templates/claude-work.txt` → `lib/templates/agent-work.txt`
- `lib/templates/claude-tasks.txt` → `lib/templates/agent-tasks.txt`
- `lib/templates/claude-goals.txt` → `lib/templates/agent-goals.txt`
- `lib/templates/claude-ideas.txt` → `lib/templates/agent-ideas.txt`

## Code changes needed

### lib/cli/agent.ts (formerly claude.ts)
- Rename `CLAUDE_SUBCOMMANDS` → `AGENT_SUBCOMMANDS`
- Rename `ClaudeSubcommand` type → `AgentSubcommand`
- Rename `generateClaudeGreeting()` → `generateAgentGreeting()`
- Rename `generateClaudeHelp()` → `generateAgentHelp()`
- Rename `claude()` function → `agent()`
- Update all `loadTemplate('claude-*')` calls → `loadTemplate('agent-*')`

### lib/cli/main.ts
- Update import: `import { claude } from './claude'` → `import { agent } from './agent'`
- Update COMMANDS array: `'claude'` → `'agent'`
- Update case statement: `case 'claude'` → `case 'agent'`
- Update function call: `claude(ctx, ...)` → `agent(ctx, ...)`

### lib/cli/agent.test.ts (formerly claude.test.ts)
- Update all imports from `'./claude'` → `'./agent'`
- Update all `claude()` calls → `agent()`
- Update all `CLAUDE_SUBCOMMANDS` → `AGENT_SUBCOMMANDS`
- Update all test strings: `'dust claude work'` → `'dust agent work'`, etc.
- Update test descriptions

### lib/cli/main.test.ts
- Update test: `'routes claude command correctly'` → `'routes agent command correctly'`
- Update test args: `['claude']` → `['agent']`
- Update assertions checking for 'claude' in COMMANDS/HELP_TEXT

### lib/templates/help.txt
- Line 12: `claude [cmd]` → `agent [cmd]`
- Line 23: `{{bin}} claude work` → `{{bin}} agent work`

### lib/templates/agent-*.txt (formerly claude-*.txt)
- Update all `{{bin}} claude work` → `{{bin}} agent work`
- Update all `{{bin}} claude tasks` → `{{bin}} agent tasks`
- Update all `{{bin}} claude goals` → `{{bin}} agent goals`
- Update all `{{bin}} claude ideas` → `{{bin}} agent ideas`
- Update all `{{bin}} claude help` → `{{bin}} agent help`

### CLAUDE.md
- Update: `bin/dust claude` → `bin/dust agent`

### .dust/tasks/separate-task-planning-and-implementation.md
- Update all references from `dust claude` → `dust agent`

## Goals

- [Easy Adoption](../goals/easy-adoption.md)

## Blocked by

(none)

## Definition of done

- [ ] All files renamed as listed above
- [ ] All code references updated from `claude` to `agent`
- [ ] All template content updated with new command names
- [ ] All tests pass with new names
- [ ] `bin/dust check` passes
- [ ] `bin/dust agent` works correctly (formerly `bin/dust claude`)

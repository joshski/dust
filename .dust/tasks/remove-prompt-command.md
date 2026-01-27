# Remove prompt command

The `prompt` command is no longer needed. It was originally designed to output prompts that could be passed to any AI agent, but the current approach uses `bin/dust agent` which provides contextual prompts directly.

## Goals

- [Agent Agnostic](../goals/agent-agnostic.md)

## Blocked by

(none)

## Definition of done

- [ ] Remove `lib/cli/prompt.ts`
- [ ] Remove `lib/cli/prompt.test.ts`
- [ ] Remove prompt command from `lib/cli/main.ts`
- [ ] Remove any references to the prompt command in documentation or facts
- [ ] All tests pass

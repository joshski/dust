# Agent-Specific Instructions

Projects using dust should be able to provide agent-specific instructions that are displayed when an agent runs `dust agent`. For example, a project with databases could inform Claude Code Web that PostgreSQL and Redis are available in that environment.

## Implementation

Add support for loading markdown files from `.dust/config/agents/{agent-type}.md`:

- `.dust/config/agents/claude-code-web.md` - Instructions for Claude Code Web
- `.dust/config/agents/claude-code.md` - Instructions for Claude Code
- `.dust/config/agents/codex.md` - Instructions for Codex

### Changes Required

1. **`lib/cli/commands/agent-shared.ts`** - Add a function `loadAgentInstructions(cwd, fileSystem, agentType)` that:
   - Looks for `.dust/config/agents/{agent-type}.md`
   - Returns the file contents if it exists, or empty string if not

2. **`lib/cli/commands/agent-shared.ts`** - Update `templateVariables()` to:
   - Accept `fileSystem` and `cwd` parameters
   - Call `loadAgentInstructions()` and include result as `agentInstructions` variable

3. **`lib/templates/agent-greeting.txt`** - Add conditional section:
   ```
   {{#if agentInstructions}}

   ## Project Instructions

   {{agentInstructions}}
   {{/if}}
   ```

4. **Update callers** of `templateVariables()` to pass the new parameters

## Goals

- [Agent-Specific Enhancement](../goals/agent-specific-enhancement.md)

## Blocked By

(none)

## Definition of Done

- [x] `loadAgentInstructions` function loads markdown from `.dust/config/agents/{agent-type}.md`
- [x] `templateVariablesWithInstructions` includes `agentInstructions` in returned object
- [x] `agent-greeting.txt` template displays instructions when present
- [x] Instructions are not displayed when no file exists for the agent type
- [x] Unit tests cover the new functionality

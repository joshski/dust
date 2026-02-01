# Integrate "explore" terminology in agent templates

Claude Code has an "Explore" tool that is described as: "Fast agent specialized for exploring codebases. Use this when you need to quickly find files by patterns, search code for keywords, or answer questions about the codebase."

Using terminology like "explore the codebase" in dust agent instructions can encourage Claude to use this tool effectively, rather than relying on sequential file reads or manual searches. This aligns with dust's goal of agents discovering context autonomously.

## Changes

Update the following agent templates in `lib/templates/` to use "explore" terminology where appropriate:

1. **agent-implement-task.txt** - Add a step to explore affected code before implementing:
   - After step 2 (running check), add: "Explore the codebase to understand the affected areas and existing patterns"

2. **agent-pick-task.txt** - Encourage exploration when understanding task scope:
   - Change "read its file to understand the requirements" to "read its file and explore the codebase to understand the requirements and affected areas"

3. **agent-new-task.txt** - Already contains "Explore the codebase" in step 3, no changes needed

4. **agent-greeting.txt** - No changes needed (routing instructions only)

## Goals

- [Agent Context Inference](../goals/agent-context-inference.md)
- [Agent-Specific Enhancement](../goals/agent-specific-enhancement.md)

## Blocked by

(none)

## Definition of done

- [ ] `agent-implement-task.txt` includes an exploration step before implementation
- [ ] `agent-pick-task.txt` encourages exploration when understanding task scope
- [ ] All tests pass

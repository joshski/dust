# Move agent instructions below routing block

Move agent-specific instructions below the routing block in the `agent-greeting.txt` template, so the critical routing instructions appear first.

## Context

Currently the template places agent-specific instructions above the routing instructions. The routing instructions are the most important part of the greeting — they tell the agent what to do next. Agent-specific instructions are supplementary context that varies by project and agent type.

## Implementation

In `lib/templates/agent-greeting.txt`:

1. Move the `{{#if agentInstructions}}` block from lines 2-7 to after line 31 (after "Do NOT proceed without running one of these commands.")
2. Remove the `## Project Instructions` heading
3. Add a horizontal rule (`---`) as separator before the instructions
4. Keep the instructions inside the existing conditional

The result should look like:

```
🤖 Hello {{agentName}}, welcome to dust!

CRITICAL: You MUST run exactly ONE of the commands below...
...
Do NOT proceed without running one of these commands.
{{#if agentInstructions}}

---

{{agentInstructions}}
{{/if}}
```

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md) - Placing critical routing instructions first ensures agents act on them immediately

## Blocked By

(none)

## Definition of Done

- [ ] Agent-specific instructions appear after the routing block
- [ ] A horizontal rule separates the routing block from agent instructions
- [ ] The "## Project Instructions" heading is removed
- [ ] No separator or extra content appears when there are no agent instructions
- [ ] All checks pass (`bin/dust check`)

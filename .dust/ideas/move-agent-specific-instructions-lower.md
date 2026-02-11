# Move agent-specific instructions lower

Move agent-specific instructions below the routing block in the `agent-greeting.txt` template, so the critical routing instructions appear first.

Currently the template places agent-specific instructions (loaded from `.dust/config/agents/{agent-type}.md`) above the routing instructions:

```
🤖 Hello {{agentName}}, welcome to dust!

## Project Instructions

[agent-specific instructions]

CRITICAL: You MUST run exactly ONE of the commands below...
```

The routing instructions are the most important part of the greeting — they tell the agent what to do next. Agent-specific instructions are supplementary context that varies by project and agent type. Placing supplementary content before the critical routing block means the agent reads project-specific prose before it reaches the action it must take.

The proposal is to move agent-specific instructions below the routing block:

```
🤖 Hello {{agentName}}, welcome to dust!

CRITICAL: You MUST run exactly ONE of the commands below...

---
By the way...

[agent-specific instructions]
```

This is a small change to `lib/templates/agent-greeting.txt` — move the `{{#if agentInstructions}}` block from lines 2-7 to after line 31, with the new "By the way..." framing.

Currently no `.dust/config/agents/` files exist in this repository, so the conditional block doesn't render. But the feature is available for any project using dust.

## Open Questions

### Is "By the way..." the right framing?

#### "By the way..."

Casual and conversational. Signals that these are secondary instructions. Might feel too informal for teams that want their agent config taken seriously.

#### A markdown heading like "## Additional Instructions"

More structured and conventional. Clearly labels the section. But headings carry weight in LLM prompts — a heading might make the agent treat these instructions as equally important to the routing block above.

#### No label, just a horizontal rule

A bare `---` separator with the instructions below. Minimal and unobtrusive. The downside is that the instructions appear without any framing, which could be confusing if the agent-specific content is long or complex.

### Should the "## Project Instructions" heading be preserved?

#### Drop it

The current `## Project Instructions` heading was appropriate when the section appeared at the top. In the new position below a separator, a heading may be unnecessary or even counterproductive (it could re-elevate the section's perceived importance). The new framing text ("By the way..." or equivalent) replaces it.

#### Keep it under the separator

Preserve `## Project Instructions` as a sub-heading after the separator. This keeps the section clearly labeled and easy to find in long output. But combined with the separator and framing text, it might feel over-decorated.

### Should the separator and framing be omitted when there are no agent instructions?

#### Yes, wrap everything in the existing conditional

The existing `{{#if agentInstructions}}` conditional already handles this. The entire block (separator, framing, and instructions) would be inside the conditional and only render when instructions exist. No change needed to the conditional logic.

#### No, always show the separator

Always render the separator and framing text, even when there are no agent-specific instructions. This would provide a consistent visual structure but adds noise when the section is empty. Unlikely to be desirable.

# Improve dust agent greeting

Add an introductory paragraph to the `dust agent` greeting that explains what dust is before presenting routing instructions.

## Background

The current greeting jumps straight into "CRITICAL: You MUST run exactly ONE of the commands below" without context. An agent encountering dust for the first time has no understanding of what dust is or why the CLI commands exist before being told to run one.

## Implementation

Modify the `agentGreeting` function in `lib/cli/commands/agent.ts` to add introductory text after the welcome line and before the routing instructions.

The introduction should:

1. Explain dust's purpose in 1-2 sentences
2. Include a brief note that dust uses markdown files in `.dust/` directories
3. Remain concise to balance context window efficiency with progressive disclosure

Example structure:

```
🤖 Hello ${agentName}, welcome to dust!

[introduction paragraph here]

CRITICAL: You MUST run exactly ONE of the commands below...
```

Keep the existing routing instructions and "CRITICAL" framing unchanged.

## Principles

- [Context Window Efficiency](../principles/context-window-efficiency.md) - Introduction should be concise
- [Progressive Disclosure](../principles/progressive-disclosure.md) - Brief intro layers information before details
- [Agent Autonomy](../principles/agent-autonomy.md) - Helps agents understand dust's purpose

## Blocked By

(none)

## Definition of Done

- `agentGreeting` function includes introductory text explaining dust
- Introduction mentions markdown artifacts in `.dust/`
- Existing routing instructions remain unchanged
- Existing tests pass (`bin/dust check`)

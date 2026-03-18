# Add Mini Guide to Task Prompts

Add a brief dust introduction to task-oriented prompts so agents can discover project context using dust commands.

## Context

When agents work autonomously in `dust loop` or `dust bucket worker` modes, they receive task-oriented prompts built by `buildTaskPrompt()` in `lib/loop/iteration.ts`. These prompts assume the agent already understands dust—they don't mention that `dust ideas`, `dust principles`, or `dust facts` commands exist. This leads to inefficient agent behavior like manually searching `.dust/` directories instead of using commands.

The `dust agent` greeting in `lib/cli/commands/agent.ts` provides a conceptual introduction, but task prompts skip this entirely.

## Implementation

Add a "Dust Quick Reference" section to the prompt built by `buildTaskPrompt()`. The guide should:

1. Explain what dust is (one sentence)
2. List key commands for discovering project context
3. Include negative guidance: tell agents to use dust commands instead of manually searching `.dust/`
4. Be short enough to preserve context window efficiency

Example guide text:

```markdown
## Dust Quick Reference

Dust stores project context in `.dust/` as markdown artifacts. Use these commands to explore:

- `dust ideas` — list ideas for future work
- `dust principles` — show guiding values and design constraints
- `dust facts` — show current state documentation
- `dust help` — see all available commands

Use dust commands instead of manually searching `.dust/` directories.
```

Place this section between the task content and the implementation instructions. Keep it separate from the bucket tools section (which appears after implementation instructions).

Following "Functional Core, Imperative Shell", define the guide text as a constant that `buildTaskPrompt()` incorporates.

## Principles

- [Agent Context Inference](../principles/agent-context-inference.md)
- [Context Window Efficiency](../principles/context-window-efficiency.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Blocked By

(none)

## Definition of Done

- `buildTaskPrompt()` includes the mini guide section in its output
- The guide appears between task content and implementation instructions
- Guide text tells agents to use dust commands instead of manual `.dust/` searches
- Unit tests verify the guide is included in task prompts
- `bin/dust check` passes

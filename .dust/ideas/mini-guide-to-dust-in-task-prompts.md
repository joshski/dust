# Mini guide to dust in task prompts

Include a brief dust introduction in task-oriented prompts to help agents use dust commands effectively.

## Context

When an agent runs interactively via `dust agent`, it receives a greeting that introduces dust conceptually:

> "Dust is a CLI tool for managing software development workflows through markdown artifacts. It stores tasks, ideas, principles, and facts in `.dust/` directories, giving you structured context about the project and a backlog to work from."

The greeting then routes agents to appropriate commands based on user intent.

However, when agents work autonomously in `dust loop` or `dust bucket worker` modes, they receive task-oriented prompts built by `buildTaskPrompt()` in `lib/loop/iteration.ts:458-474`. These prompts include:

1. The task file path and content
2. Implementation instructions (check, commit, push workflow)
3. Optionally, a tools section for bucket-defined tools

The prompts assume the agent already understands dust. They don't mention that `dust ideas`, `dust principles`, or `dust facts` commands exist. This leads to inefficient agent behavior like:

- Running `Grep .dust/ideas/*` instead of `dust ideas`
- Manually reading fact files instead of running `dust facts`
- Missing relevant principles that could guide implementation

The existing `dust agent` greeting in `lib/cli/commands/agent.ts:16-52` provides the conceptual introduction, but task prompts skip this entirely.

Related artifacts:
- [Context aware guidance](context-aware-guidance.md) discusses varying agent guidance based on repository maturity
- [Centralize artifact-writing guidance](centralize-artifact-writing-guidance-for-cli-commands.md) proposes shared instruction helpers
- [Agent Context Inference](../principles/agent-context-inference.md) principle states terse prompts should trigger correct action
- [Context Window Efficiency](../principles/context-window-efficiency.md) principle favors concise guidance

## Proposed Solution

Include a brief "mini guide to dust" in task-oriented prompts. This guide would:

1. Explain what dust is (one sentence)
2. List the key commands for discovering project context
3. Be short enough to preserve context window efficiency

Example mini guide:

```markdown
## Dust Quick Reference

Dust stores project context in `.dust/` as markdown artifacts. Use these commands to explore:

- `dust ideas` — list ideas for future work
- `dust principles` — show guiding values and design constraints
- `dust facts` — show current state documentation
- `dust help` — see all available commands
```

This would be injected into task prompts between the task content and the implementation instructions.

## Open Questions

### Where should the mini guide be defined?

#### Option: In buildTaskPrompt directly

Add the guide text inline in `lib/loop/iteration.ts`. Simple, single location to maintain.

#### Option: Shared helper module

Create a helper like `lib/cli/shared/dust-mini-guide.ts` that both `dust agent` and task prompts can import. Reduces duplication if the greeting and mini guide should stay in sync.

#### Option: Configurable via settings

Allow repositories to customize or disable the guide via `.dust/config/settings.json`. Supports context-window-constrained environments.

### Should the mini guide vary based on context?

#### Option: Static guide for all tasks

Same mini guide regardless of task type, repository maturity, or available tools. Simple and predictable.

#### Option: Task-type-aware guide

Different guidance for different workflow tasks (e.g., capture tasks might emphasize artifact creation commands, implement tasks might emphasize context discovery commands).

#### Option: Presence-aware guide

Only mention commands that are actually useful (e.g., skip "dust principles" if no principles exist, include bucket tools when running in bucket mode).

### How should this interact with bucket tools?

#### Option: Separate sections

Keep the mini guide and the tools section as distinct parts of the prompt. The mini guide covers dust commands; the tools section covers bucket-defined tools.

#### Option: Unified tools guidance

Merge bucket tools into a single "Available commands and tools" section that includes both dust commands and bucket tools.

### Should agents be told explicitly not to search .dust/ manually?

#### Option: Negative guidance

Explicitly state: "Use dust commands instead of manually searching `.dust/` directories."

#### Option: Positive guidance only

Only describe what to do, not what to avoid. Trust agents to prefer the recommended approach.

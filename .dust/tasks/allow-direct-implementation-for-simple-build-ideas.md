# Allow direct implementation for simple Build Ideas

Update the "Build Idea" task template to instruct the agent that it may implement simple ideas directly without creating intermediate task files.

When `buildItNow: true` is used, the current workflow always requires creating task file(s) before implementation. For trivially simple ideas, this creates overhead without benefit. The proposed change allows the agent to:

1. Research the idea briefly
2. If confident the implementation is straightforward, implement directly and commit
3. If uncertain about scope or approach, fall back to creating task file(s) as before

This change modifies only the Build Idea task template content in `createCaptureIdeaTask` (`lib/artifacts/workflow-tasks.ts`). No interface changes are needed.

## Principles

- [Lightweight Planning](../principles/lightweight-planning.md) - avoids unnecessary planning overhead for trivial work
- [Fast Feedback](../principles/fast-feedback.md) - reduces time from idea to implementation for simple changes
- [Agent Autonomy](../principles/agent-autonomy.md) - trusts agent judgment to determine when direct implementation is appropriate

## Blocked By

(none)

## Definition of Done

- [ ] Build Idea task template updated to allow direct implementation
- [ ] Template includes guidance for when to fall back to task creation
- [ ] Commit message format remains standard (as per resolved question)

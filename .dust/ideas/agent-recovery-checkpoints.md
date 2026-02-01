# Agent Recovery Checkpoints

Allow agents to record progress checkpoints during task implementation, enabling graceful recovery if interrupted.

## Problem

When an agent fails mid-task (context limit, error, network issue), all progress is lost. The next agent starts fresh with no knowledge of what was already attempted or discovered.

## Concept

Tasks could optionally include a `## Progress` section that agents update as they work:

```markdown
## Progress

- [x] Located relevant files: src/cli.ts, lib/commands/
- [x] Understood existing pattern: command dispatch via switch
- [ ] Implement new command handler
- [ ] Add tests
- [ ] Update help text
```

When a new agent picks up the task, it sees what was already done and can continue from there.

## Alignment with Goals

- **Agent Autonomy** - Agents can resume without human re-explanation
- **Context Window Efficiency** - Previous work summarized, not repeated
- **Small Units** - Checkpoints encourage breaking work into discrete steps

## Open Questions

- Should progress live in the task file or a separate file?
- How to handle conflicting progress from multiple failed attempts?
- Should checkpoints be optional or required?

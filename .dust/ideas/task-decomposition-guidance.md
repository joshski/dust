# Task Decomposition Guidance

Provide guidance or tooling for breaking down tasks that are too large.

## Problem

The "Small Units" goal emphasizes fine-grained work, but there's no guidance on how to decompose a task that turns out to be too big. Agents may attempt large tasks and produce incomplete work.

## Concept

When an agent realizes a task is too large mid-implementation, they could:

1. **Split the task** - Create multiple smaller task files from the original
2. **Mark dependencies** - Use Blocked By sections to sequence them
3. **Preserve progress** - Move any completed work to the first sub-task

A `dust split task` command could assist:

```bash
dust split task add-user-auth
# Creates: add-user-auth-model.md, add-user-auth-api.md, add-user-auth-ui.md
# with appropriate dependencies
```

## Alignment with Goals

- **Small Units** - Actively enforces the goal when violated
- **Agent Autonomy** - Agents can self-correct without human intervention
- **Atomic Commits** - Smaller tasks lead to smaller, cleaner commits

## Warning Signs for Decomposition

- Definition of Done has more than 5 items
- Task touches more than 3 files
- Implementation requires multiple logical phases
- Different parts could be tested independently

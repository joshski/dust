# Work Quality Retrospectives

Capture learnings from completed tasks to improve future agent work.

## Problem

When a task is deleted, all context about how it was completed is lost. There's no feedback loop to identify patterns in agent mistakes or successes.

## Concept

After task completion, agents could optionally record:

1. **Challenges encountered** - What made this harder than expected?
2. **Insights gained** - What should future agents know?
3. **Goal alignment** - Did the work truly support stated goals?

This could live in a `retrospectives/` directory or be appended to facts.

## Example

```markdown
# Retrospective: Add Timeout Support

## Completed: 2024-01-15

## Challenges
- Edge case with zero timeout not obvious from task description
- Had to explore three files to understand existing pattern

## Insights for Future Work
- Timeout handling follows pattern in lib/utils/timing.ts
- Tests for timeouts use fake timers, not real waits

## Goal Alignment
- Supports Fast Feedback goal by preventing hung operations
```

## Alignment with Goals

- **Make Changes with Confidence** - Learn from past implementation experiences
- **Human-AI Collaboration** - Humans see how agents approached work
- **Lightweight Planning** - Optional, delete after value extracted

## Open Questions

- How long to retain retrospectives?
- How to surface relevant retrospectives to future agents?

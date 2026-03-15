# Skip invalid tasks in queue

Refuse to pick up tasks that fail validation, preventing silent misbehavior when task files are malformed.

## Context

The `findUnblockedTasks` function in `lib/cli/commands/next.ts` determines which tasks are ready to work on. It reads each task's `## Blocked By` section to check for incomplete blockers. If the section is missing entirely, `extractBlockedBy` returns an empty array — making the task appear unblocked.

This creates a dangerous failure mode: a task with no `## Blocked By` section (which is a validation error per `lib/lint/validators/content-validator.ts:8`) gets treated as having no blockers, so it rises to the top of the queue. A task that should be blocked by others gets picked up first.

This was observed in production when a decompose workflow produced tasks using `## Dependencies` with plain text references instead of dust's required `## Blocked By` with markdown links. All 10 tasks appeared unblocked, and the loop processed them in an effectively random order (determined by git timestamps).

The validation already exists — `validateTaskHeadings` checks for required `## Blocked By` and `## Definition of Done` headings. But `findUnblockedTasks` doesn't run validation, so invalid tasks slip through silently.

## How it could work

Before considering a task for the queue, `findUnblockedTasks` would run task validation on it. Tasks with validation errors would be excluded from the returned list and reported as warnings.

The `dust next` command would display invalid tasks separately, e.g.:

```
📋 Next tasks

# Implement auth
→ .dust/tasks/implement-auth.md

⚠️  Skipped (invalid)

# Migrate data
  Missing required heading: "## Blocked By"
→ .dust/tasks/migrate-data.md
```

In the loop, skipped tasks would be logged so operators can see why work isn't progressing.

## Related ideas

- [Run dust check before starting agent session](run-dust-check-before-starting-agent-session.md) — a complementary approach that catches problems at the loop level before any task is picked
- [Structurally deterministic queue order](structurally-deterministic-queue-order.md) — addresses the ordering of valid tasks; this idea addresses what happens with invalid ones

## Open Questions

### Which validations should block task pickup?

#### Only required headings (recommended)

Check for `## Blocked By` and `## Definition of Done` — the two headings that directly affect queue behavior and task completion criteria. Other lint issues (filename casing, opening sentence style) are cosmetic and shouldn't block work.

#### Full task validation

Run all validators that apply to tasks. This is stricter but could block tasks for minor formatting issues that don't affect correctness.

### Should invalid tasks count as "no tasks available"?

#### Yes, treat as empty queue

If all tasks are invalid, the loop reports "no tasks available" and waits. This prevents the loop from churning on unfixable work but means a formatting issue could stall progress silently.

#### No, surface them as fixable work

If all remaining tasks are invalid, spawn an agent with a "fix invalid tasks" prompt (similar to the "fix checks" pattern). The agent gets the validation errors and attempts to fix the task files.

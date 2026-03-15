# Created section in tasks

Add a `## Created` section to task files containing an ISO date, so queue order among unblocked peers is deterministic from file contents alone.

## Context

When multiple tasks are unblocked simultaneously, dust needs a tiebreaker to decide which one to process first. Currently this uses git commit timestamps (`lib/git/file-sorter.ts`), which has problems:

- `git log -1 --format=%ct` returns the **last modified** time, not creation time — so editing a task (e.g. updating its blockers) changes its queue position
- Git timestamps differ across clones, rebases, and cherry-picks
- Uncommitted files have no git timestamp at all
- The ordering is invisible — you can't tell from reading the files what order they'll be processed in

A `## Created` section would make the FIFO tiebreaker part of the file content, like `## Blocked By` already makes dependencies part of the content. This aligns with the goal in [Structurally deterministic queue order](structurally-deterministic-queue-order.md) of making queue order derivable entirely from task files.

## How it could work

Task files would include a section like:

```markdown
## Created

2026-03-13
```

The `renderTask` function in `lib/artifacts/workflow-tasks.ts:329` would add this section at task creation time. The `findUnblockedTasks` function in `lib/cli/commands/next.ts` would parse it and use it as the sort key instead of git timestamps.

Tasks without a `## Created` section would sort last, preserving backwards compatibility with existing task files.

The `computeExecutionOrder` function in dustbucket (`src/lib/execution-order.ts`) would also switch from `lastCommittedAt` to parsing the created date from task content, making the UI consistent with the CLI.

## Related ideas

- [Structurally deterministic queue order](structurally-deterministic-queue-order.md) — the broader idea of content-based ordering; this is a specific mechanism for tiebreaking among peers
- [Skip invalid tasks in queue](skip-invalid-tasks-in-queue.md) — complements this by ensuring tasks have valid structure before entering the queue

## Open Questions

### Should `## Created` be a required heading?

#### Yes, require it like `## Blocked By`

Add it to `REQUIRED_HEADINGS` in `lib/lint/validators/content-validator.ts`. This ensures every task has a deterministic sort key. Existing tasks would need migration.

#### No, keep it optional

Tasks without it sort last. This avoids breaking existing tasks and manually-created ones, but means the ordering fallback for missing dates needs to be defined (alphabetical by slug, or undefined).

### What granularity should the date have?

#### Date only (recommended)

`2026-03-13` — simple, readable, sufficient for FIFO ordering. Tasks created on the same day tie-break alphabetically by slug.

#### Full ISO timestamp

`2026-03-13T10:30:00Z` — precise ordering even for tasks created minutes apart, but adds noise to the file and raises questions about timezones.

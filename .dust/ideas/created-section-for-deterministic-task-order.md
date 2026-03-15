# Created section for deterministic task order

Add a `## Created` section to task files containing an ISO date so queue order among unblocked peers is deterministic from task content.

## Context

When multiple tasks are unblocked simultaneously, dust currently relies on filesystem/git timestamps for ordering. Those signals are mutable and environment-dependent, so queue order can drift across edits and clones.

A `## Created` heading would make task ordering explicit and visible in the file itself, similar to `## Blocked By`.

## How it could work

Task files include:

```markdown
## Created

2026-03-13
```

`renderTask` in `lib/artifacts/workflow-tasks.ts` writes the section at creation time, and `findUnblockedTasks` in `lib/cli/commands/next.ts` uses it as a sort key.

## Open Questions

### Should `## Created` be required?

#### Yes

Require it in task lint rules for full determinism.

#### No (recommended)

Keep it optional and sort tasks without it last to preserve backwards compatibility.

### Should it be date-only or full timestamp?

#### Date only (recommended)

Readable and usually sufficient.

#### Full timestamp

Higher precision, but noisier and timezone-sensitive.

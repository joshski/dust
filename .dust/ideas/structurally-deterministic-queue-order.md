# Structurally deterministic queue order

Replace timestamp-based task ordering with explicit blocking relationships, making queue order entirely determined by task dependencies.

## Context

Currently, the `dust next` command determines queue order through a two-tier system:

1. **Blocking filter**: Tasks with incomplete blockers (i.e., their `## Blocked By` references still exist) are excluded entirely
2. **Timestamp sort**: Among unblocked tasks, ordering uses git commit timestamps (oldest first, FIFO)

The timestamp logic lives in two places:
- [`lib/cli/commands/next.ts:83-87`](../../lib/cli/commands/next.ts) — fallback using `fileSystem.getFileCreationTime()`
- [`lib/git/file-sorter.ts`](../../lib/git/file-sorter.ts) — production sorter using `git log -1 --format=%ct` to get commit timestamps

This approach has drawbacks:
- **External dependency**: Relies on git history, which can be rewritten, missing, or inconsistent across clones
- **Hidden complexity**: The ordering logic isn't visible in the task files themselves
- **Non-deterministic for new files**: Uncommitted files have undefined order

## How it could work

Instead of using timestamps, queue order would be entirely structural. If task A should be done before task B, then B would list A in its `## Blocked By` section. When A is completed (file deleted), B becomes unblocked and rises to the top of the queue.

Among tasks at the same "level" (no blocking relationships between them), they would appear in a simple deterministic order such as alphabetical by filename. This order is transparent and reproducible.

Example with three tasks:
- `implement-auth.md` — no blockers, appears first alphabetically
- `add-logout.md` — blocked by `implement-auth.md`, appears after auth is done
- `write-tests.md` — blocked by `implement-auth.md`, appears alongside `add-logout.md` once auth is done

When `implement-auth.md` is completed:
- Both `add-logout.md` and `write-tests.md` become unblocked
- They appear in alphabetical order: `add-logout.md` first, then `write-tests.md`

## Benefits

- **Transparent**: Queue order is visible by reading task files
- **Reproducible**: Same order on any machine, any time
- **Git-independent**: No reliance on commit history
- **Self-documenting**: Dependencies are explicit, aiding understanding

## Relationship to existing ideas

This idea differs from [Task priority](task-priority.md) and [Idea priority](idea-priority.md):
- Priority adds a metadata field to indicate urgency (high/medium/low)
- This idea uses structural relationships (blocking) to determine order
- The two could coexist: priority for urgency within unblocked peers, blocking for sequencing

## Open Questions

### How should peer tasks (unblocked, no blocking relationship) be ordered?

#### Alphabetical by filename

Sort unblocked tasks alphabetically by their filename. Simple, deterministic, and requires no additional metadata. However, filenames may not reflect logical priority — `aaa-low-priority.md` would appear before `zzz-critical-fix.md`.

#### Creation order via explicit metadata

Add an optional `## Created` section with a timestamp. Tasks without it sort last. This preserves FIFO intent but introduces metadata maintenance.

#### No defined order (implementation-dependent)

Leave peer order undefined, allowing the implementation to use any stable sort. This is simplest but may surprise users who expect consistent ordering.

#### Combine with priority

Use the priority system from [Task priority](task-priority.md) to order peers. High-priority tasks appear first, then medium, then low. Within each priority tier, use alphabetical order. This requires implementing task priority first.

### Should blocking cycles be detected and reported?

#### Detect and error on cycles

When listing tasks, detect cycles and emit an error. This prevents deadlocks but adds complexity to the queue logic.

#### Detect and warn

Show a warning but still list other unblocked tasks. Users can manually fix the cycle.

#### No detection

Trust users to avoid cycles. If tasks are permanently blocked, they simply never appear in the queue. This is the current behavior.

### Should ideas also use structural ordering?

#### Yes, extend to ideas

Ideas could have a `## Blocked By` section referencing other ideas. This would create a backlog pipeline where foundational ideas are addressed first.

#### No, keep ideas simple

Ideas are meant for brainstorming and don't need sequencing. Alphabetical order is sufficient.

#### Optional blocking for ideas

Ideas can optionally have blocking relationships, but it's not required or enforced. This offers flexibility without mandating structure.

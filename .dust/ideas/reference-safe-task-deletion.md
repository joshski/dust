# Reference-safe task deletion

Expose an API to delete a task and remove its references from other task files.

## Context

The repository API in `lib/artifacts/index.ts` currently exposes task creation and read/query operations (`createIdeaTask`, `createRefineIdeaTask`, `createDecomposeIdeaTask`, `createShelveIdeaTask`, `parseTask`, `listTasks`, `buildTaskGraph`) but no task deletion method.

Today, task completion is done by deleting the task markdown file directly. `dust next` treats a missing blocker as completed (`lib/cli/commands/next.ts`), so downstream tasks unblock as soon as the blocker file disappears.

However, link validation still enforces referential integrity. `validateLinks` in `lib/lint/validators/link-validator.ts` reports broken links when remaining task files still point to a deleted task. This creates a gap between "task completion" and "link-safe repository state".

There is already a patch-style API (`validatePatch` in `lib/validation/index.ts`) that supports deletion (`null` values) and validates the resulting overlay filesystem before changes are applied. This is close to a changeset API, but it does not provide a task-specific operation that rewrites references.

## Problem

Deleting a task by removing `.dust/tasks/<slug>.md` can leave stale links in other `## Blocked By` sections, causing lint failures and forcing callers to hand-edit multiple files.

The current API surface makes this harder than task creation:

- Creation has dedicated methods on `ArtifactsRepository`.
- Deletion requires custom filesystem operations outside the repository abstraction.
- `FileSystem` currently has no delete primitive in `lib/filesystem/types.ts`, so write-path APIs cannot delete files directly without further design changes.

## Idea

Add a task deletion operation that is reference-safe by construction.

Potential behavior:

1. Identify all task files that reference the target task.
2. Remove those references from `## Blocked By` sections (or broader scope, depending on final decision).
3. Delete the target task file.
4. Return a structured result describing what was changed.
5. Validate the resulting change-set before write (or generate a patch for caller-side validation).

## Candidate API directions

### Direction A: mutating repository method

Add a method on `ArtifactsRepository`, e.g. `deleteTask({ taskSlug })`, that performs rewrite + deletion via the repository's `FileSystem`.

Pros:
- Symmetric with existing create-task methods.
- Simple for callers.

Cons:
- Requires adding delete capability to `FileSystem` (or implementing a workaround).
- Harder to offer dry-run behavior.

### Direction B: patch-producing method

Add a method that returns an `ArtifactPatch` for safe deletion, e.g. `buildDeleteTaskPatch({ taskSlug })`, then callers apply it after `validatePatch`.

Pros:
- Fits the existing patch validation model.
- Supports preview/dry-run naturally.
- Avoids immediate filesystem type expansion.

Cons:
- Two-step flow for callers (build patch + apply patch).
- Needs a separate patch-apply path if not already provided at this layer.

### Direction C: dedicated utility in validation/workflow layer

Introduce a helper near `lib/validation` that computes and validates a delete patch without changing repository interface.

Pros:
- Minimal surface-area change.
- Reuses overlay validation directly.

Cons:
- Splits task lifecycle operations across modules.
- Less discoverable than repository methods.

## Design constraints from current code

- Task dependency semantics are link-based (`## Blocked By`) and file-existence-based for scheduling (`lib/cli/commands/next.ts`).
- Semantic link rules require `## Blocked By` links to point into `.dust/tasks/` (`lib/lint/validators/link-validator.ts`).
- `validatePatch` already models deletion and catches resulting broken links (`lib/validation/validation.test.ts` includes deletion scenarios).
- `FileSystem` abstraction supports write/rename but not unlink (`lib/filesystem/types.ts`).

## Suggested rollout shape

1. Define canonical delete semantics (scope of "reference" and formatting rules).
2. Implement a patch-generation helper for reference-safe delete.
3. Integrate via repository API (mutating or patch-returning).
4. Add tests for:
- deleting task with no inbound references
- deleting task referenced by one or many tasks
- preserving `(none)` behavior in `## Blocked By`
- idempotency/error behavior when target task does not exist
- multi-reference lines and mixed markdown formatting

## Open Questions

### Where should the primary API live?

#### Option: `ArtifactsRepository.deleteTask(...)`

Use a first-class mutating repository method for discoverability and symmetry with create-task methods.

#### Option: `ArtifactsRepository.buildDeleteTaskPatch(...)`

Expose deletion as a patch-construction API and let callers validate/apply changes explicitly.

#### Option: Validation-layer helper only

Keep repository unchanged and offer a lower-level helper that computes a reference-safe delete patch.

### What counts as a "reference" that must be removed?

#### Option: Only `## Blocked By` task links

Treat dependency links as the only semantic references to rewrite; leave narrative mentions untouched.

#### Option: All markdown links to the deleted task in `.dust/tasks/`

Rewrite any task-file markdown link targeting the deleted task, regardless of section.

#### Option: All links across `.dust/` artifacts

Rewrite links in tasks, ideas, facts, and principles to ensure global link integrity after deletion.

### How should missing-target behavior work?

#### Option: Strict error

Return an error if `taskSlug` does not exist, preventing silent no-op behavior.

#### Option: Idempotent no-op

Treat missing target as already deleted and return success with zero changes.

#### Option: Configurable strictness

Default to strict, with an explicit `allowMissing` flag for bulk/automated workflows.

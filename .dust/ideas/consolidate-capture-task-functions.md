# Consolidate Capture Task Functions

Two functions in `lib/artifacts/workflow-tasks.ts` contain duplicated iteration logic.

## Current State

Both functions:
1. Check if tasks directory exists
2. Read all `.md` files
3. Parse titles with the same regex (`/^#\s+(.+)$/m`)
4. Check for `CAPTURE_IDEA_PREFIX` and `EXPEDITE_IDEA_PREFIX`
5. Extract task slugs with the same pattern

`findAllWorkflowTasks` (introduced in commit 76a4bf4) was designed as a batch operation to scan tasks once and return both capture tasks and workflow task mappings. It already computes `captureIdeaTasks` as part of its result.

## Proposed Change

Refactor `findAllCaptureIdeaTasks` to delegate to `findAllWorkflowTasks` and extract the `captureIdeaTasks` field, eliminating the duplicated iteration logic.

## Considerations

- `findAllCaptureIdeaTasks` is exported from `lib/artifacts/index.ts` and may have external consumers
- The refactored version would be semantically identical but slightly less efficient (computing unused workflow task map)
- Alternatively, extract shared logic into a helper function used by both

## Open Questions

### Should we keep findAllCaptureIdeaTasks as a public API?

#### Option: Deprecate and remove

If there are no external consumers, remove the standalone function and direct callers to use `findAllWorkflowTasks().captureIdeaTasks` instead. Simpler API surface.

#### Option: Keep as convenience wrapper

Maintain the function but implement it via delegation to reduce duplication. Preserves backwards compatibility.

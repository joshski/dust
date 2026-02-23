# Remove findAllCaptureIdeaTasks Function

Remove the standalone `findAllCaptureIdeaTasks` function from `lib/artifacts/workflow-tasks.ts` and its export from `lib/artifacts/index.ts`. Callers should use `findAllWorkflowTasks().captureIdeaTasks` instead, which provides identical functionality without duplicated iteration logic.

## Principles

- [Reasonably DRY](../principles/reasonably-dry.md)
- [Maintainable Codebase](../principles/maintainable-codebase.md)

## Blocked By

(none)

## Definition of Done

- [ ] `findAllCaptureIdeaTasks` function is removed from `lib/artifacts/workflow-tasks.ts`
- [ ] Export of `findAllCaptureIdeaTasks` is removed from `lib/artifacts/index.ts`
- [ ] Tests for `findAllCaptureIdeaTasks` are removed or updated to test via `findAllWorkflowTasks`
- [ ] `bin/dust check` passes

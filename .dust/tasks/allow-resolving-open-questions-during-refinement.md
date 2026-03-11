# Allow resolving open questions during refinement

Add an optional `openQuestionResponses` parameter to `createRefineIdeaTask` so users can resolve open questions when creating a refine-idea task, matching the existing pattern in `decomposeIdea`.

## Background

The `decomposeIdea` function (`lib/artifacts/workflow-tasks.ts:370-396`) accepts `DecomposeIdeaOptions` which includes an optional `openQuestionResponses` field. It passes these through to `createIdeaTransitionTask` as `resolvedQuestions`, which renders a `## Resolved Questions` section via `renderResolvedQuestions`.

However, `createRefineIdeaTask` (`lib/artifacts/workflow-tasks.ts:343-368`) only accepts `ideaSlug` and `description` — no mechanism to pass resolved questions. The underlying `createIdeaTransitionTask` already supports `resolvedQuestions` in its `taskOptions`, so the plumbing is in place.

## Changes Required

1. **`lib/artifacts/workflow-tasks.ts`**: Add `openQuestionResponses?: OpenQuestionResponse[]` parameter to `createRefineIdeaTask` and pass it through as `resolvedQuestions` in the `taskOptions` object (line 366)
2. **`lib/artifacts/index.ts`**: Update the `createRefineIdeaTask` interface method (lines 77-81) to accept `openQuestionResponses?: OpenQuestionResponse[]`
3. **Repository implementation** in `lib/artifacts/index.ts`: Update the `buildArtifactsRepository` implementation to pass the new parameter through
4. **`.dust/facts/workflow-task-transitions.md`**: Document that `createRefineIdeaTask` now accepts optional open question responses

## Principles

- [Batteries Included](../principles/batteries-included.md)
- [Agent Autonomy](../principles/agent-autonomy.md)
- [Enable Flow State](../principles/enable-flow-state.md)

## Blocked By

(none)

## Definition of Done

- [ ] `createRefineIdeaTask` accepts optional `openQuestionResponses` parameter
- [ ] Resolved questions are rendered in the refine-idea task file when provided
- [ ] `ArtifactsRepository` interface updated to accept the new parameter
- [ ] Existing tests continue to pass (no regressions)
- [ ] New test covers refine-idea task creation with resolved questions
- [ ] `.dust/facts/workflow-task-transitions.md` updated to document the new parameter

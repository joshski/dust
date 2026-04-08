# Break cyclic dependency in lib/artifacts types

Move shared type definitions so that `types.ts` does not import from domain files that depend on it.

## Background

`lib/artifacts/types.ts` imports types from `workflow-tasks.ts`, `tasks.ts`, `principles.ts`, `ideas.ts`, and `facts.ts`. Those files in turn depend on `types.ts`, creating a 6-node cycle.

The root cause is that `types.ts` pulls in type definitions (`TaskType`, `WorkflowTaskMatch`, `ParsedCaptureIdeaTask`, `Task`, `Principle`, `Idea`, `Fact`) from files that themselves import from `types.ts`.

## Approach

Move the type definitions that `types.ts` needs (`TaskType`, `WorkflowTaskMatch`, `ParsedCaptureIdeaTask`, `Task`, `Principle`, `Idea`, `Fact`) into `types.ts` itself, or into a separate leaf module that has no imports from the domain files. Then remove the circular imports from `types.ts`.

## Files

- `lib/artifacts/types.ts` - imports from all 5 domain files
- `lib/artifacts/workflow-tasks.ts` - defines `TaskType`, `WorkflowTaskMatch`, `ParsedCaptureIdeaTask`
- `lib/artifacts/tasks.ts` - defines `Task`
- `lib/artifacts/principles.ts` - defines `Principle`
- `lib/artifacts/ideas.ts` - defines `Idea`
- `lib/artifacts/facts.ts` - defines `Fact`

## Task Type

implement

## Principles

- [Decoupled Code](../principles/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- `types.ts` has no imports from domain files in `lib/artifacts/`
- All domain files can still import from `types.ts`
- All existing tests pass
- No cyclic dependency exists between these files

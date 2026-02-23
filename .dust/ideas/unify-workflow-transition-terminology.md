# Unify Workflow-Transition Terminology

The codebase uses "workflow task" and "transition task" interchangeably to describe tasks that operate on ideas (Refine, Decompose, Shelve). This inconsistency can confuse developers working with the code.

## Current State

The terminology is split across different contexts:

| Usage | Term Used |
|-------|-----------|
| File name | `workflow-tasks.ts` |
| Constant | `IDEA_TRANSITION_PREFIXES` |
| Return type | `CreateIdeaTransitionTaskResult` |
| Function | `findWorkflowTaskForIdea` |
| Type | `WorkflowTaskMatch`, `WorkflowTaskType` |
| Documentation | Mixed ("workflow tasks" and "transition tasks") |
| Test descriptions | "transition task" in some tests |
| Error messages | "Idea transition task references..." |

## Analysis

Both terms describe the same concept: tasks that manage the lifecycle of ideas by refining, decomposing, or shelving them. The conceptual difference is subtle:

- **Workflow tasks** emphasizes that these tasks follow a defined workflow pattern
- **Transition tasks** emphasizes that these tasks transition an idea to a different state

Neither term is inherently better, but using both creates unnecessary cognitive load.

## Open Questions

### Which term should be the canonical one?

#### Option: Standardize on "workflow task"

"Workflow" already dominates the public API (`WorkflowTaskType`, `WorkflowTaskMatch`, `findWorkflowTaskForIdea`) and file naming (`workflow-tasks.ts`). Standardizing here minimizes breaking changes to exports.

#### Option: Standardize on "transition task"

"Transition" more precisely describes what these tasks do: they transition ideas through lifecycle states. The constant `IDEA_TRANSITION_PREFIXES` already uses this term.

#### Option: Use "idea lifecycle task" or "idea operation task"

A new term that avoids ambiguity between the existing options. This would require renaming everything but could be clearer.

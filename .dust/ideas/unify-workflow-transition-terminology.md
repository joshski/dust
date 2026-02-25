# Unify Workflow-Transition Terminology

The codebase uses "workflow task" and "transition task" interchangeably to describe tasks that operate on ideas (Refine, Decompose, Shelve). This inconsistency can confuse developers working with the code.

## Current State

The terminology is split across different contexts:

| Usage | Term Used | Count |
|-------|-----------|-------|
| File name | `workflow-tasks.ts` | 1 |
| Constant | `IDEA_TRANSITION_PREFIXES` | 1 |
| Return type | `CreateIdeaTransitionTaskResult` | 1 |
| Function | `findWorkflowTaskForIdea`, `findAllWorkflowTasks`, `validateWorkflowTaskBodySection` | 3 |
| Internal function | `createIdeaTransitionTask`, `validateIdeaTransitionTitle` | 2 |
| Type | `WorkflowTaskMatch`, `WorkflowTaskType`, `AllWorkflowTasks` | 3 |
| Documentation | `.dust/repository.md`, `.dust/facts/workflow-tasks.md` | "workflow task" throughout |
| Test descriptions | "transition task" in 3 tests | 3 |
| Error messages | `Idea transition task references...` | 1 |
| Error messages | `Workflow task with "..." prefix...` | 1 |

## Analysis

Both terms describe the same concept: tasks that manage the lifecycle of ideas by refining, decomposing, or shelving them. The conceptual difference is subtle:

- **Workflow tasks** emphasizes that these tasks follow a defined workflow pattern
- **Transition tasks** emphasizes that these tasks transition an idea to a different state

The codebase research shows "workflow task" is dominant:
- All public types use "workflow" (`WorkflowTaskType`, `WorkflowTaskMatch`, `AllWorkflowTasks`)
- All public functions use "workflow" (`findWorkflowTaskForIdea`, `findAllWorkflowTasks`)
- The primary source file is `workflow-tasks.ts`
- The fact file documenting this is `workflow-tasks.md`
- All prose documentation uses "workflow task"

The "transition" terminology appears only in internal implementation details and a single constant name.

## Recommendation

Standardize on "workflow task". This term already dominates the public API and documentation. The changes required are minimal:

**Renames required:**
- `IDEA_TRANSITION_PREFIXES` → `WORKFLOW_TASK_PREFIXES` (constant)
- `CreateIdeaTransitionTaskResult` → `CreateWorkflowTaskResult` (type)
- `createIdeaTransitionTask` → `createWorkflowTask` (internal function)
- `validateIdeaTransitionTitle` → `validateWorkflowTaskTitle` (internal function)
- Error message: "Idea transition task references..." → "Workflow task references..."
- 3 test descriptions: "transition task" → "workflow task"

**No changes needed:**
- File name `workflow-tasks.ts` (already correct)
- Public types and functions (already use "workflow")
- Documentation (already uses "workflow task")

This is a straightforward refactoring with no behavioral changes.

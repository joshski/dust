# Skip task creation for simple ideas

For sufficiently simple "buildItNow" ideas, implement them directly without creating intermediate task files.

## Context

The current workflow has two paths for new ideas:

1. **Standard path**: `Add Idea` task → creates idea file → `Decompose Idea` task → creates task file(s) → implementation
2. **Fast-track path** (`buildItNow: true`): `Build Idea` task → creates task file(s) → implementation

Both paths require at least one task file before any implementation can begin. The `createCaptureIdeaTask` function in `lib/artifacts/workflow-tasks.ts:345-411` always creates a task file, even when `buildItNow` is true.

However, some ideas are simple enough that the overhead of task creation adds no value:

- A one-line fix with obvious implementation
- Adding a simple property to an existing interface
- Removing dead code that's already identified
- Updating a constant or configuration value

For these cases, the [Task-First Workflow](../principles/task-first-workflow.md) principle ("Work should be captured as a task before implementation begins") creates friction without proportional benefit. The task file becomes a formality that exists only to be immediately deleted after a trivial change.

The [Fast Feedback](../principles/fast-feedback.md) principle suggests that workflow overhead should be minimized when it doesn't contribute to quality: "Slow feedback discourages frequent validation and leads to larger, riskier changes."

### Related ideas

- [Fix confused instructions](fix-confused-instructions.md) - addresses naming confusion with "Build Idea" tasks
- [Context aware guidance](context-aware-guidance.md) - explores adapting guidance based on task complexity
- [Capture "Complexity Estimate" in tasks](capture-complexity-estimate-in-tasks.md) - considers adding complexity metadata to tasks
- [Allow "analysis depth" when adding an idea](allow-analysis-depth-when-adding-an-idea.md) - proposes varying research depth for ideas

### Current flow for buildItNow

When `buildItNow: true` is passed to `createCaptureIdeaTask`:

1. A `Build Idea: <title>` task file is created
2. The task instructs the agent to "create one or more narrowly-scoped task files"
3. Agent creates task files
4. Agent picks up a task and implements it
5. Task file is deleted

For a trivial change, steps 2-4 are pure overhead.

## Proposed Implementation

When a user specifies `buildItNow`, they are declaring the idea is simple enough for direct implementation. The "Build Idea" task should instruct the agent to:

1. Research the idea briefly
2. If confident the implementation is straightforward, implement it directly and commit
3. If in any doubt about scope or approach, fall back to creating task file(s)

This requires no interface changes - only updating the content of the Build Idea task template in `createCaptureIdeaTask`.

### Why this works

- **User opts in**: By using `buildItNow`, the user has already judged the idea as simple
- **Agent judgment provides safety**: The agent creates task files when uncertain
- **Task file still exists**: The Build Idea task provides traceability
- **Minimal change**: Only the task instructions change, not the workflow structure

### Trade-offs

- Relies on agent judgment to identify when doubt exists
- May occasionally implement something that deserved more planning
- Consistent with [Agent Autonomy](../principles/agent-autonomy.md) principle

## Open Questions

### Should the commit message format differ for direct implementations?

#### Option: Standard format

Use the same commit message format as task-based implementations. The Build Idea task title becomes the commit message.

**Trade-off:** Consistent with existing commits. No special handling needed.

#### Option: Special prefix

Add a prefix like "Quick:" or "Direct:" to distinguish direct implementations from task-based ones.

**Trade-off:** Makes git history searchable for direct implementations. May be unnecessary complexity.

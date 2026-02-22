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

For a trivial change, steps 1-4 are pure overhead.

## How it could work

A new option (e.g., `implementNow: true`) would bypass task creation entirely:

1. Agent receives instruction to implement directly
2. Agent implements the change
3. Agent commits with a message describing the change

No idea file. No task file. Just implementation and commit.

This could be exposed via:
- A flag on `createCaptureIdeaTask`: `{ buildItNow: true, implementNow: true }`
- A separate function: `createDirectImplementationInstruction()`
- A CLI command: `dust implement "fix typo in README"`

## Open Questions

### How should "simple enough" be determined?

#### Option: User explicitly opts in

When adding an idea, the user (or agent) declares it as implementation-ready. This could be a flag like `--now` or `--implement`. Full control, no risk of misclassification.

**Trade-off:** Adds friction if used frequently. Users must judge complexity upfront.

#### Option: Agent judges after minimal research

The agent receives the idea and does lightweight assessment before deciding whether to implement directly or create tasks. Similar to how [Context aware guidance](context-aware-guidance.md) proposes agent assessment of repository maturity.

**Trade-off:** Relies on agent judgment. May be inconsistent. Could lead to direct implementation of changes that deserved more planning.

#### Option: Heuristic based on description length/keywords

Short descriptions (e.g., under 50 characters) or specific keywords ("typo", "rename", "bump version") trigger direct implementation. Automatic but crude.

**Trade-off:** Easy to game or trigger accidentally. May not capture actual complexity.

### What happens to traceability?

#### Option: The commit message serves as the record

Without task files, the commit message becomes the sole record of intent. The commit would include the original idea description. Consistent with "delete completed work rather than archive it" from [Lightweight Planning](../principles/lightweight-planning.md).

**Trade-off:** No intermediate artifact. If the agent misunderstands and commits incorrectly, there's no task file to compare against.

#### Option: Create a minimal log entry somewhere

Write a line to a log file or append to a changelog before implementing. Provides traceability without full task overhead.

**Trade-off:** Adds complexity. Log files can grow stale. May be "just enough" overhead to question why not use tasks.

#### Option: Rely on git history

The commit message and diff provide complete traceability. No additional artifacts needed. Matches how most developers work outside of dust.

**Trade-off:** Less structured than task files. Harder to query for patterns.

### Should dust check or validate anything before direct implementation?

#### Option: Run dust check before implementing

Ensure the repository is in a good state before making changes. Matches the current task workflow which starts with `dust check`.

**Trade-off:** Adds a step, but it's a valuable one. Quick validation before change.

#### Option: No pre-checks for direct implementation

Trust the agent to manage their own pre-implementation checks. Maximizes speed for truly trivial changes.

**Trade-off:** Risk of implementing on a broken baseline. Inconsistent with disciplined workflow.

### Does this undermine the Task-First Workflow principle?

#### Option: Yes, and that's acceptable for trivial changes

Principles have exceptions. Task-First exists to prevent scope creep and maintain traceability. For a one-line typo fix, neither concern applies. Document this as an explicit exception.

**Trade-off:** Creates ambiguity about when the principle applies. Agents may over-apply the exception.

#### Option: Reframe as "Intent-First Workflow"

The principle could be reinterpreted: work should have documented intent before implementation. A commit message describing the change fulfills this requirement without a task file.

**Trade-off:** Philosophical shift. May weaken the discipline that Task-First provides.

#### Option: Keep tasks mandatory, focus on making them lighter

Rather than eliminating tasks, make task creation faster. Auto-generate simple tasks. Reduce the instructions for obvious changes.

**Trade-off:** Still requires task files. May be "enough" overhead that the problem persists.

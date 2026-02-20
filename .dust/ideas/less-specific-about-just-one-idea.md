# Less specific about "just one idea"

The "Add Idea" workflow task template currently instructs agents to "create an idea file" (singular) at a specific predetermined path. This is overly prescriptive when the original idea description actually warrants multiple distinct idea files.

## Context

The `createCaptureIdeaTask` function in `lib/artifacts/workflow-tasks.ts:324-349` generates task content that says:

> Research this idea thoroughly, then create an idea file at `.dust/ideas/{slug}.md`.

And the Definition of Done includes:

> - [ ] Idea file exists at .dust/ideas/{slug}.md

This locks the agent into producing exactly one artifact at a predetermined location. In contrast, the "Build Idea" workflow (`BUILD_IDEA_PREFIX`) already uses more flexible language: "create one or more narrowly-scoped task files" - demonstrating that the system already accommodates variable artifact counts in other contexts.

## Rationale

Ideas often start vague. When researched, what seemed like one idea may reveal itself as two or more distinct concepts that would benefit from separate idea files. The [Small Units](../principles/small-units.md) principle supports this: "Ideas, principles, facts, and tasks should each be as discrete and fine-grained as possible."

## Open Questions

### Should the template allow multiple ideas, or require one per task?

#### Allow multiple ideas

Change the template language to say "create one or more idea files" and update the Definition of Done to reflect this flexibility. This mirrors the approach already used for "Build Idea" tasks. The agent would determine, through research, how many idea files are appropriate.

#### Keep one idea per task, but allow splitting

Keep the current singular requirement but add explicit guidance that if research reveals multiple distinct ideas, the agent should create the primary idea file plus additional "Add Idea" tasks for the others. This maintains atomic commits but adds coordination overhead.

### How should multiple ideas be reflected in the commit message?

#### List all created ideas in the commit body

The commit title stays as "Add Idea: {original title}" but the body lists all idea files created. This maintains traceability without changing the title format.

#### Change the title format when multiple ideas are created

Use a different commit message format like "Add Ideas: {count} ideas from {original title}". This makes it immediately visible in the log that multiple artifacts were created.

#### Keep the original title regardless

The commit message uses the original task title. The commit diff shows which files were created, so no additional messaging is needed.

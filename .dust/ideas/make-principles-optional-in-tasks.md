# Make principles optional in tasks

Allow tasks to omit the `## Principles` section entirely rather than requiring it with `(none)` as a placeholder.

Currently, every task file must contain a `## Principles` heading, even if it contains `(none)`. This is enforced by the `REQUIRED_HEADINGS` array in `content-validator.ts`. Making principles optional would reduce boilerplate for tasks where explicit principle alignment isn't valuable, while still allowing principle links when they provide meaningful traceability.

The [Lightweight Planning](../principles/lightweight-planning.md) principle favors minimal overhead. Requiring a `(none)` placeholder in every task adds visual noise without benefit. However, the [Task-First Workflow](../principles/task-first-workflow.md) principle emphasizes traceability between intent and outcome — explicit principle links could strengthen this traceability by connecting tasks to the reasoning behind them.

## Open Questions

### What does "optional" mean?

#### Remove from required headings only

Tasks no longer fail linting if `## Principles` is missing entirely. Tasks that do include the heading still get full link validation (must point to `.dust/principles/` files). Workflow task templates continue to include `## Principles\n\n(none)` as a default, making it easy to add principles but not mandatory. This is the minimal change — the lint rule relaxes, everything else stays the same.

#### Remove from templates as well

In addition to removing from required headings, also remove the `## Principles` section from generated task templates. Tasks start with no Principles section and users/agents add it when relevant. This reduces boilerplate further but means agents must remember to add the section when principles are appropriate, rather than being prompted by a placeholder.

### Should there be guidance for when to include principles?

#### No guidance — leave it to judgment

Agents and users decide when principle alignment is worth documenting. Some tasks naturally connect to principles (e.g., refactoring for testability relates to testing principles); others are purely mechanical (e.g., "fix typo"). No formal rules or lint checks — just remove the requirement and trust users.

#### Lint warning for certain task types

Certain task types (e.g., tasks from `Decompose Idea:` workflow) could emit a lint warning if principles are missing, since those tasks are more likely to benefit from explicit principle alignment. This adds complexity but nudges toward better documentation on tasks where it matters.

#### Documentation only

Add a note to the task file format fact explaining when principles are valuable (design decisions, architectural changes, principle-derived tasks) vs. when they can be omitted (bug fixes, typos, mechanical changes). No enforcement — just guidance.

# Self-Onboarding Task

When running `dust init` in a new repository, automatically create a task that guides agents through first-time project setup.

## Context

The `dust init` command (`lib/cli/commands/init.ts:58-191`) currently performs these setup steps:

1. Creates `.dust/` directory structure (principles, ideas, tasks, facts, config)
2. Creates an initial fact file (`use-dust-for-planning.md`)
3. Creates `settings.json` with auto-detected `dustCommand` and `checks` (test command)
4. Creates or warns about `CLAUDE.md` and `AGENTS.md` with agent instructions

After initialization, the repository is technically ready for use. However, for existing codebases with established conventions, the auto-generated settings may be incomplete or incorrect. For example:

- The `checks` array only includes a test command if detected, missing build, lint, or other quality gates
- Projects may need custom configuration like `eventsUrl` or `extraDirectories`
- The `installCommand` may not be set if detection fails

Currently, `dust init` outputs "next steps" suggestions to the terminal, but these are ephemeral and not surfaced to agents who start working later.

## Proposed Behavior

When `dust init` runs, it creates an additional task file (e.g., `.dust/tasks/configure-dust-settings.md`) that prompts the agent to:

1. Review the auto-generated `settings.json`
2. Explore the codebase to discover check commands (lint, build, typecheck, etc.)
3. Update `settings.json` with appropriate checks for the project
4. Verify the configuration by running `dust check`
5. Delete the task file upon completion (standard task workflow)

This aligns with the [Task-First Workflow](../principles/task-first-workflow.md) principle — the configuration work is captured as an explicit task, making it discoverable and traceable.

## Implementation Notes

Changes required in `lib/cli/commands/init.ts`:

1. Add a new function to generate the onboarding task content
2. Write the task file alongside other initialization artifacts
3. Use the `wx` flag (atomic write) to avoid overwriting if already exists

The task should be a standard task file with `## Blocked By` (none) and `## Definition of Done` sections, following the [Task File Format](../facts/task-file-format.md).

## Open Questions

### Should the task be created for all repositories or only existing codebases?

#### Create for all repositories (recommended)

Always create the onboarding task. Even for new repositories, reviewing and confirming settings is a useful first step. The task can be quickly completed if no changes are needed.

Benefits: Consistent behavior; encourages review of settings; provides a clear first task for agents.
Costs: Minor overhead for projects where auto-detection is sufficient.

#### Only create when settings appear incomplete

Skip creating the task if auto-detection populated the `checks` array. Only create when settings seem to need human/agent review.

Benefits: Avoids unnecessary tasks for well-detected projects.
Costs: Complex heuristics to determine "completeness"; may miss cases where checks are detected but wrong.

#### Let the user decide via a flag

Add a `--skip-onboarding-task` or `--with-onboarding-task` flag to `dust init`.

Benefits: Full control for users who know what they want.
Costs: More flags to learn; inconsistent behavior across repositories.

### What should the task be named?

#### "Configure dust settings"

A descriptive name that clearly states what the task accomplishes.

Benefits: Self-explanatory; matches the action being performed.
Costs: Could be confused with ongoing settings maintenance.

#### "Complete dust setup"

Emphasizes that this is a one-time setup completion step.

Benefits: Clear that it's a first-time action.
Costs: Less specific about what "setup" entails.

#### "Review project configuration"

Broader framing that invites exploration of the codebase.

Benefits: Encourages thorough review; not just about settings.
Costs: May seem too open-ended; unclear when "done".

### Should the task include backfilling principles and facts?

#### Focus only on settings.json (recommended)

Keep the task narrowly scoped to reviewing and configuring `settings.json`. Backfilling principles and facts can be suggested in the task description or left as a separate optional activity.

Benefits: Clear, achievable scope; faster completion; principles/facts are less urgent than working checks.
Costs: Doesn't fully onboard the repository; agent may need prompting for additional setup.

#### Include principles and facts backfill

The onboarding task also asks the agent to explore the codebase and add relevant principles and facts.

Benefits: Comprehensive first-time setup; repository is fully onboarded.
Costs: Much larger scope; may take multiple sessions; could overwhelm new users.

#### Create separate optional tasks

Generate multiple tasks: one required (configure settings) and optional ones (add principles, add facts).

Benefits: Granular control; can be prioritized differently.
Costs: More files; may feel cluttered for small projects.

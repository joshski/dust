# Agent Developer UX Assessment

Dust should help assess the "agent developer experience" of a given repository and generate tasks to improve it.

When dust is adopted in a new repository, or periodically in an existing one, it should be able to evaluate how well the repository supports autonomous agent work. The assessment examines the repository through the lens of dust's goals — things like whether tasks are small enough for single iterations, whether context is efficiently structured, whether feedback loops are fast, and whether an agent can orient itself without human help.

The output is a set of dust tasks, each targeting a specific dimension of the agent DX. For example:

- **Onboarding clarity** — Can an agent understand the project's purpose, structure, and conventions from what's checked in? Are there CLAUDE.md / .dust files / READMEs that explain enough?
- **Task granularity** — Are existing tasks scoped small enough for a single agent iteration? Are they actionable without further decomposition?
- **Feedback speed** — Can an agent run checks, tests, and lints quickly enough to iterate confidently? Are there pre-commit hooks or CI checks that provide fast validation?
- **Context efficiency** — Is the codebase structured so an agent can find what it needs without consuming excessive context? Are files reasonably sized? Are conventions consistent?
- **Error actionability** — When something fails, do error messages tell the agent what to do next? Or do they require human interpretation?
- **Autonomy readiness** — Can an agent pick up a task and complete it end-to-end without asking a human for help? Are dependencies documented? Are build steps scripted?

## Open Questions

### How should the assessment be invoked?

#### `dust assess`

A dedicated top-level command. The user runs `dust assess` and gets a report plus generated tasks. Simple and discoverable. The downside is that it's a one-off action with no obvious place in the regular workflow.

#### `dust new tasks --from assessment`

Framed as a way to generate tasks, not as a separate concept. This fits the existing task-first workflow and makes it clear that the output is actionable work, not just a report. The downside is a less intuitive command name for newcomers.

#### `dust doctor`

Borrows the familiar `doctor` convention (like `brew doctor` or `flutter doctor`). Communicates "check if things are healthy and suggest fixes." The downside is that it implies fixing problems rather than improving the experience, which may limit the scope of suggestions.

### Should the assessment generate tasks directly or produce a report first?

#### Generate tasks directly

The assessment creates task files in `.dust/tasks/`, ready to be picked up. This is actionable and fits the task-first workflow. The risk is generating low-quality or irrelevant tasks without human review.

#### Produce a report, then optionally generate tasks

The assessment outputs a markdown report summarizing findings. The user can then choose to convert specific findings into tasks. This adds a review step but also adds friction. Could work well as `dust assess` producing a report, followed by `dust assess --apply` to create the tasks.

#### Produce a report with inline task proposals

The report includes proposed task definitions inline (as fenced code blocks or a structured section). The user reviews the report and runs a follow-up command to accept specific proposals. This balances visibility with actionability.

### Should the assessment be goal-aware?

#### Yes, assess against the repository's own goals

The assessment reads `.dust/goals/` and evaluates how well the repository supports each goal. This produces highly relevant findings but requires goals to already exist. It also means the assessment is only as good as the goals — vague goals produce vague assessments.

#### No, use a fixed set of agent DX dimensions

The assessment uses a built-in rubric (like the dimensions listed above) regardless of what goals exist. This works even in repositories with no goals defined and provides a consistent baseline. The downside is that it may flag things the team doesn't care about.

#### Both, with goals as an overlay

Start with the fixed rubric, then layer on goal-specific analysis if goals exist. This provides a useful baseline for any repository while also respecting the team's stated priorities. The downside is complexity — two passes may produce overlapping or contradictory findings.

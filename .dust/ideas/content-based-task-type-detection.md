# Content-based task type detection

Identify task types based on the presence of specific markdown sections rather than title prefixes.

## Current State

Task types are currently detected using a hybrid approach:

1. **Title prefixes** (`Add Idea: `, `Expedite Idea: `, `Refine Idea: `, etc.) in `workflow-tasks.ts`:
   - `findAllWorkflowTasks()` checks `CAPTURE_IDEA_PREFIX` and `EXPEDITE_IDEA_PREFIX`
   - `parseCaptureIdeaTask()` determines `expedite` status from title prefix

2. **Section-based detection** for transition tasks:
   - `WORKFLOW_SECTION_HEADINGS` defines `Refines Idea`, `Decomposes Idea`, `Shelves Idea`, `Expedites Idea`
   - `findWorkflowTaskForIdea()` scans for these sections to identify task type
   - `parseCaptureIdeaTask()` requires `## Idea Description` section for capture tasks

The section-based approach is already canonical for transition tasks—`findWorkflowTaskForIdea()` explicitly ignores title and looks only at body sections. But capture tasks still rely on title prefixes.

## Proposed Change

Define a canonical section for each task type and derive the task type from that section alone:

| Task Type | Canonical Section |
|-----------|-------------------|
| add-idea | `## Idea Description` (without `## Expedites Idea` or `## Refines Idea` etc.) |
| expedite-idea (capture) | `## Idea Description` |
| expedite-idea (transition) | `## Expedites Idea` |
| refine-idea | `## Refines Idea` |
| decompose-idea | `## Decomposes Idea` |
| shelve-idea | `## Shelves Idea` |

This removes title-prefix parsing from type detection logic. Titles become purely descriptive—useful for humans but not parsed for semantics.

## Benefits

- **Single source of truth**: Task type lives in the document structure, not duplicated in title
- **Editing flexibility**: Renaming a task title doesn't risk breaking type detection
- **Cleaner validation**: Validators check sections, not title/section agreement
- **Simpler parsing**: One code path for type detection instead of prefix + section fallback

## Affected Code

- `lib/artifacts/workflow-tasks.ts`:
  - `findAllWorkflowTasks()` — replace title prefix checks with section detection
  - `parseCaptureIdeaTask()` — derive `expedite` from presence of `## Expedites Idea` section
- `lib/lint/validators/idea-validator.ts`:
  - `validateIdeaTransitionTitle()` — could be removed or simplified
  - `validateWorkflowTaskBodySection()` — becomes the primary validation

## Open Questions

### How to distinguish Add Idea from Expedite Idea capture tasks?

#### Add a discriminating section

Currently both Add Idea and Expedite Idea capture tasks have `## Idea Description`. The title prefix (`Add Idea:` vs `Expedite Idea:`) distinguishes them. Introducing `## Expedites Idea Description` or similar for expedite capture tasks would provide a clear signal, but changes the task template.

#### Use an inline marker

Add a frontmatter-style marker like `expedite: true` at the top of the file. Breaks markdown purity.

#### Keep title-based discrimination for this case only

Accept that capture task mode (add vs expedite) is an exception that uses the title. Pragmatic but inconsistent.

#### Introduce a separate `## Task Type` section

A dedicated section like `## Task Type\n\nExpedite Idea` that explicitly states the type. Verbose but universal.

### Should title prefixes be removed from generated tasks?

#### Keep prefixes as convention

If titles are no longer parsed for type detection, the prefixes (`Add Idea:`, `Refine Idea:`, etc.) become optional convention. Keeping them in generated tasks preserves human readability and existing familiarity. No code change required for generation, only for parsing.

#### Remove prefixes from generated tasks

Generate tasks with descriptive titles only (e.g., `# Smarter Error Recovery` instead of `# Add Idea: Smarter Error Recovery`). Cleaner titles, but breaks familiarity.

#### Make prefixes configurable

Allow repositories to opt out of prefixes via `.dust/config/settings.json`. Maximum flexibility but added complexity.

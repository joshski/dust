# Workflow associations by body sections

Workflow tasks that operate on ideas (refine, decompose, shelve, add, build) currently identify their target idea through the task title. The title prefix (e.g., `Refine Idea: `) combined with the idea title after the prefix determines which idea file the task relates to. This approach has worked but creates a fragile coupling: the relationship depends on exact title matching and filename derivation rules.

Instead, workflow tasks could include an explicit section in the task body that declares the relationship directly, similar to how `## Principles` and `## Blocked By` already work.

## Current Approach

The current implementation in `lib/artifacts/workflow-tasks.ts` uses title prefixes:

- `IDEA_TRANSITION_PREFIXES`: "Refine Idea: ", "Decompose Idea: ", "Shelve Idea: "
- `CAPTURE_IDEA_PREFIX`: "Add Idea: "
- `BUILD_IDEA_PREFIX`: "Build Idea: "

The `findWorkflowTaskForIdea` function reads the idea's title, constructs expected task filenames for each prefix using `titleToFilename()`, and checks if those files exist. This requires:

1. Reading the idea file to get its title
2. Applying filename derivation rules (lowercase, replace dots/spaces with hyphens, remove special chars)
3. Checking for each possible prefix variant

This title-based lookup is unidirectional and requires understanding the filename derivation rules to navigate relationships.

## Proposed Alternative

Add a body section that explicitly declares which idea a workflow task operates on. The section heading itself indicates the operation type:

- `## Refines Idea` — for refine tasks
- `## Decomposes Idea` — for decompose tasks
- `## Shelves Idea` — for shelve tasks
- `## Creates Idea` — for add/build tasks that produce new ideas

Each section contains a markdown link to the idea file, following the same pattern used for `## Principles` and `## Blocked By`.

This would make the relationship:
- **Explicit**: The link is visible in the task body, not encoded in the title
- **Self-describing**: The heading communicates both the relationship and the operation type
- **Consistent**: Uses the same markdown link pattern as `## Principles` and `## Blocked By`
- **Navigable**: Both humans and code can follow the link directly
- **Robust**: Renaming an idea wouldn't break the association if the link is updated

The existing `extractLinksFromSection` function in `lib/artifacts/tasks.ts` could parse these sections, reusing the pattern already established for principles and blocked-by relationships. Code could check for any of the known operation headings to determine both the target idea and the operation type in a single pass.

## Trade-offs

**Benefits:**
- Applies [Clarity Over Brevity](../principles/clarity-over-brevity.md) by making relationships self-documenting
- Aligns with [Small Units](../principles/small-units.md) by making each relationship explicit rather than derived
- Simplifies the `findWorkflowTaskForIdea` implementation — it could grep for links rather than construct filenames
- Allows bidirectional lookup without filename derivation

**Costs:**
- Adds redundancy: the title still names the idea, and now the body also links to it
- Requires updating existing task generation code to include the new section
- May require migration of existing workflow tasks
- The title prefix convention is already established and working

## Open Questions

### Should the title prefix convention be retained alongside explicit body sections?

#### Option: Keep prefixes, add body section as redundant backup

Retain the existing title-based convention but also include the operation-specific section (e.g., `## Refines Idea`). This provides both human-readable titles ("Refine Idea: Progress Broadcasting") and machine-parseable body links. The body section serves as the source of truth for code, while the title remains human-friendly. This is additive and backwards-compatible.

#### Option: Keep prefixes, use body section as primary source of truth

The title prefix remains for readability, but code only uses the body section to determine relationships. If the body section is missing, the task is not associated with any idea. This breaks backwards compatibility but is cleaner long-term.

#### Option: Remove prefixes entirely, rely only on body sections

Workflow task titles become descriptive of the work itself (e.g., "Research and refine the proposal") rather than naming the target idea. The operation-specific section (`## Refines Idea`, etc.) is the only way to determine what the task operates on and what operation is being performed. This is the most explicit approach but loses the at-a-glance readability of current titles.

### How should "Add Idea" and "Build Idea" tasks be handled?

#### Option: Use `## Creates Idea` with the intended idea title

These tasks create new ideas rather than operating on existing ones. The idea file doesn't exist yet when the task is created. The section contains the title of the idea that will be created (not a link, since the file doesn't exist). Code can verify completion by checking if an idea with that title now exists. Example:

```markdown
## Creates Idea

Progress Broadcasting
```

#### Option: No relationship section for creation tasks

Add Idea and Build Idea tasks don't use this pattern at all. They continue using title prefixes only. The body section approach only applies to tasks that operate on existing ideas.

#### Option: Use `## Creates Idea` with a link to the expected path

The section contains a link to where the idea file will be created. The link is "broken" initially but becomes valid once the task is complete. This provides consistency but may confuse tooling that validates links.

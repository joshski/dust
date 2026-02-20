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

Add a body section like `## Target Idea` that explicitly declares which idea a workflow task operates on. The section would contain a markdown link to the idea file, following the same pattern used for `## Principles` and `## Blocked By`.

This would make the relationship:
- **Explicit**: The link is visible in the task body, not encoded in the title
- **Consistent**: Uses the same markdown link pattern as `## Principles` and `## Blocked By`
- **Navigable**: Both humans and code can follow the link directly
- **Robust**: Renaming an idea wouldn't break the association if the link is updated

The existing `extractLinksFromSection` function in `lib/artifacts/tasks.ts` could parse this section, reusing the pattern already established for principles and blocked-by relationships.

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

### Should the title prefix convention be retained alongside explicit body links?

#### Option: Keep prefixes, add body link as redundant backup

Retain the existing title-based convention but also include a `## Target Idea` section. This provides both human-readable titles ("Refine Idea: Progress Broadcasting") and machine-parseable body links. The body link serves as the source of truth for code, while the title remains human-friendly. This is additive and backwards-compatible.

#### Option: Keep prefixes, use body link as primary source of truth

The title prefix remains for readability, but code only uses the body link to determine relationships. If the body link is missing, the task is not associated with any idea. This breaks backwards compatibility but is cleaner long-term.

#### Option: Remove prefixes entirely, rely only on body links

Workflow task titles become generic (e.g., "Refine this idea") or describe the work without naming the target. The `## Target Idea` section is the only way to determine what the task operates on. This is the most explicit approach but loses the at-a-glance readability of current titles.

### Should this apply to all workflow task types or only some?

#### Option: Apply to all idea-related workflow tasks

All tasks that operate on ideas (Refine, Decompose, Shelve, Add Idea, Build Idea) include a `## Target Idea` section. This provides consistency and makes the pattern learnable.

#### Option: Apply only to transition tasks (Refine, Decompose, Shelve)

Add Idea and Build Idea tasks create new ideas rather than operating on existing ones. They might use a different section (e.g., `## Creates Idea`) or no section at all since the idea doesn't exist yet.

#### Option: Extend to other relationship types

Beyond ideas, this pattern could apply to other workflow relationships. For example, tasks that fix bugs might link to issue trackers, or tasks that implement facts might link to the fact file. This would generalize the concept but may be over-engineering for the current use case.

### What section heading should be used?

#### Option: `## Target Idea`

Clear and direct. "Target" implies the task acts upon this idea. Consistent with imperative naming.

#### Option: `## Idea`

Shorter but potentially ambiguous. Could be confused with a section that describes an idea rather than links to one.

#### Option: `## Related Idea`

More generic, but "related" is weaker than "target" — it doesn't convey that this is the idea being modified.

#### Option: `## Operates On`

Very explicit about the relationship type, but sounds technical and doesn't specifically indicate an idea.

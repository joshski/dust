# Artifact guide when lint fails

Show a writing guide when `dust lint` fails, so agents can fix artifacts without reading documentation first.

## Context

The `dust lint` command validates artifacts (principles, facts, ideas, tasks) and outputs violations with file paths, line numbers, and error messages. However, when an agent creates a malformed artifact, the error message alone may not provide enough guidance for correction. Agents often create artifacts without first reading the relevant documentation, leading to repeated lint failures.

For example, if an agent creates a task file missing the `## Blocked By` heading, the current output is:

```
  .dust/tasks/implement-feature.md
    Missing required heading: "## Blocked By"
```

This tells the agent what's wrong but not how a valid task file should be structured. The agent may add the heading but miss other requirements like `## Definition of Done`, leading to multiple round trips.

The existing [Actionable Errors](../principles/actionable-errors.md) principle states that error messages should provide "specific guidance on how to fix it" and "context needed to take the next step." The related idea [Suggest specific fixes in markdown lint validation](suggest-specific-fixes-in-markdown-lint-validation.md) proposes enhancing individual violation messages with fix suggestions. This idea takes a complementary approach: show a complete artifact writing guide after the violations, giving the agent a full reference for that artifact type.

## Proposed Behavior

When `dust lint` fails, after printing all violations, print a guide section for each artifact type that had violations. The guide would cover:

- Required headings and their purpose
- Opening sentence requirements (plain text, imperative form for tasks, 150 char limit)
- Filename conventions (slug-style, derived from title)
- Link formatting rules
- Type-specific requirements (e.g., Open Questions format for ideas, Parent/Sub-Principles for principles)

Example output:

```
Found 2 violation(s):

  .dust/tasks/implement-feature.md
    Missing required heading: "## Blocked By"
  .dust/tasks/implement-feature.md
    Missing required heading: "## Definition of Done"

--- Task Writing Guide ---

Task files in .dust/tasks/ must follow this structure:

# Task Title
Opening sentence in imperative form (e.g., "Add X", not "This adds X"). Max 150 characters.

## Blocked By
Links to tasks that must complete first, or "(none)" if no blockers.

## Definition of Done
- [ ] Checklist of completion criteria

## Principles (optional)
Links to principle documents this task supports.

Naming: Filename must match title in slug-style (lowercase, hyphens).
Example: "Add User Login" → add-user-login.md
```

## Open Questions

### Should guides be shown inline with violations or after all violations?

#### After all violations (summary section)

Print all violations first, then print a guide for each artifact type that had violations. This keeps the violation list scannable and provides a reference section at the end.

#### Inline with each violation

Each violation message includes its own mini-guide. For example: `Missing required heading: "## Blocked By" - This heading should contain links to blocking tasks or "(none)"`. More immediate context but makes the output longer and potentially repetitive when multiple violations affect the same artifact type.

### Should guides be artifact-type-specific or violation-specific?

#### Artifact-type-specific (full guide)

Show the complete guide for that artifact type (tasks, ideas, principles, facts). Provides comprehensive context but may include information not relevant to the specific violation.

#### Violation-specific (targeted guidance)

Only show guidance relevant to the specific violations found. For example, if only `## Blocked By` is missing, only explain that section. More concise but requires more complex logic to generate targeted guidance.

### Should guides reference existing fact files or be self-contained?

#### Self-contained text in code

Embed the guide text directly in the lint output code. Faster to display and doesn't require file reads, but duplicates information from fact files and may drift out of sync.

#### Reference and display fact files

Read and display relevant fact files (e.g., `.dust/facts/task-file-format.md`). Keeps guidance in sync with documentation but adds file I/O and depends on fact file formatting being suitable for display.

#### Link to fact files without displaying

Print a message like "See .dust/facts/task-file-format.md for task file requirements." Minimal output but requires the agent to read another file, adding another round trip.

### How verbose should the guide be?

#### Minimal (just requirements)

Show only the essential structure and rules. Quick to scan but may miss nuances.

#### Moderate (requirements with brief explanations)

Show structure with one-line explanations of each element. Balances completeness with readability.

#### Comprehensive (full documentation)

Show complete documentation including examples, edge cases, and rationale. Most helpful for unfamiliar agents but may be overwhelming and slow to process.

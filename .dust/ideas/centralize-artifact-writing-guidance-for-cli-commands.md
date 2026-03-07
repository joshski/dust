# Centralize artifact-writing guidance for CLI commands

Create one shared guidance block for artifact opening-sentence rules in `dust new idea` and `dust new task`.

## Context

Artifact lint rules are enforced centrally but taught inconsistently in CLI authoring instructions:

- `lib/lint/validators/content-validator.ts` requires an opening sentence after the H1 for all content files and enforces a 150-character maximum for that sentence.
- `lib/lint/validators/content-validator.ts` also enforces imperative opening sentences for task files.
- `lib/cli/commands/new-task.ts` teaches imperative task openings, but does not mention the 150-character cap or the requirement that the first non-blank line after H1 must be a plain paragraph sentence.
- `lib/cli/commands/new-idea.ts` does not teach opening-sentence constraints at all.

This creates preventable lint failures for agents following command instructions literally.

## Proposed Changes

Introduce a reusable instruction helper and consume it from both commands.

- Add a shared formatter (for example `lib/cli/commands/artifact-writing-guidance.ts`) that returns concise checklist lines.
- Include a common opening-sentence checklist in `dust new idea` and `dust new task`:
  - Add the opening sentence immediately after the H1.
  - Make it a plain paragraph sentence ending in `.`, `?`, or `!`.
  - Keep the first sentence at 150 characters or less.
- Add task-only guidance in `dust new task` that the opening sentence must use imperative form.
- Keep wording brief and lint-compatible to preserve context-window efficiency.

## Proposed Instruction Text (Example)

```markdown
Opening sentence checklist:
- Put the first sentence immediately after the `#` title line.
- Use a plain sentence (not a heading, list item, blockquote, or code block).
- End the sentence with `.`, `?`, or `!`.
- Keep the first sentence <= 150 characters.
- For task files, use imperative form (for example, "Add caching...", not "This task adds caching...").
```

## Implementation Notes

- `new-task.ts` currently has snapshot-like full-output assertions in `lib/cli/commands/new-task.test.ts`; these will need updates for exact text changes.
- `new-idea.ts` currently has minimal test coverage in `lib/cli/commands/new-idea.test.ts`; add assertions for the new checklist text.
- Keep command-specific guidance in command files, but source the repeated checklist from one helper to avoid drift.

## Open Questions

### Should command instructions mirror lint rules exactly or stay high-level?

#### Option: Exact lint-compatible checklist

Use explicit constraints (`<= 150`, immediate post-H1 sentence, imperative for tasks) so agents can produce valid files without trial-and-error.

#### Option: High-level writing guidance

Use softer phrasing such as "short and action-oriented" and rely on lint for exact limits.

### Should the shared guidance live in one helper or duplicated per command?

#### Option: Shared helper module

Centralize text generation to reduce drift and enforce consistent wording.

#### Option: Inline per command

Keep each command self-contained and tune wording per workflow, accepting some duplication.

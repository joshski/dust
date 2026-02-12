# Update capture idea task format to use Idea Description heading

Modify `createCaptureIdeaTask` in `lib/workflow-tasks.ts` to generate task files with a dedicated `## Idea Description` heading. This makes the user's description reliably parseable by downstream UIs.

The current format embeds the description after "start from the following description:" with no explicit boundary. The new format should be:

```markdown
# Add Idea: <title>

Research this idea thoroughly, then create an idea file at `<path>`. Read the codebase for relevant context, flesh out the description, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review `.dust/goals/` and `.dust/facts/` for relevant context.

## Idea Description

<user's description>

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file exists at <path>
- [ ] Idea file has an H1 title matching "<title>"
- [ ] Idea includes relevant context from codebase exploration
- [ ] Open questions are added for any ambiguous or underspecified aspects
```

Note: Remove the "The idea should have the title ... and start from the following description:" text from the opening sentence since the title is already in the H1 and the description now has its own section.

## Goals

- [Lint Everything](../goals/lint-everything.md)

## Blocked By

(none)

## Definition of Done

- [ ] `createCaptureIdeaTask` generates tasks with `## Idea Description` heading
- [ ] Opening sentence no longer references title/description inline
- [ ] Existing tests are updated to reflect new format
- [ ] `bin/dust check` passes

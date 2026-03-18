# Skip Idea File Check for Capture-Style Expedite Tasks

Modify `validateIdeaTransitionTitle` to skip the idea file existence check for capture-style expedite tasks. Detect capture-style tasks by the presence of an `## Idea Description` section.

## Background

There are two types of "Expedite Idea:" tasks:

1. **Capture-style** (created by `createIdeaTask({ expedite: true })`): Contains `## Idea Description` section. Does NOT reference an existing idea file.

2. **Transition-style** (created by `createExpediteIdeaTask(ideaSlug)`): Contains `## Expedites Idea` section with a link to an existing idea file.

The current validator treats both identically, requiring an idea file to exist for any task titled `Expedite Idea: <Title>`. Capture-style expedite tasks fail validation because no corresponding idea file exists.

## Implementation

In `lib/lint/validators/idea-validator.ts`:

1. Update `validateIdeaTransitionTitle` to accept the `ParsedArtifact` (which it already does)
2. Before checking for idea file existence for "Expedite Idea:" prefix, check if the artifact has an `## Idea Description` section
3. If `## Idea Description` exists, return `null` (no violation) — this is a capture-style task
4. If `## Expedites Idea` exists (or neither), proceed with the existing idea file check

This keeps the validation logic pure: it takes values in (parsed artifact, paths) and returns values out (violation or null), with the section presence check being a simple predicate on the already-parsed data.

## Blocked By

(none)

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Actionable Errors](../principles/actionable-errors.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)

## Definition of Done

- `validateIdeaTransitionTitle` returns `null` for capture-style expedite tasks (those with `## Idea Description` section)
- `validateIdeaTransitionTitle` continues to validate transition-style expedite tasks (those with `## Expedites Idea` section)
- Unit tests cover both capture-style and transition-style expedite task validation
- `bin/dust check` passes

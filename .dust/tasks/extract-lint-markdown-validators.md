# Extract lint-markdown validators

Refactor `lib/cli/commands/lint-markdown.ts` (1011 lines, 20+ exports) into focused validator modules under `lib/lint/validators/`.

## Background

The lint-markdown command currently mixes multiple concerns: individual validation functions, goal hierarchy graph algorithms, and CLI orchestration. This refactor separates validators into cohesive modules while updating all consumers to import from the new locations.

## Proposed Structure

Create the following validator modules:

- `lib/lint/validators/filename-validator.ts` - validateFilename, validateTitleFilenameMatch
- `lib/lint/validators/content-validator.ts` - validateOpeningSentence, validateOpeningSentenceLength, validateImperativeOpeningSentence, validateTaskHeadings
- `lib/lint/validators/link-validator.ts` - validateLinks, validateSemanticLinks, validateGoalHierarchyLinks
- `lib/lint/validators/idea-validator.ts` - validateIdeaOpenQuestions, validateIdeaTransitionTitle
- `lib/lint/validators/goal-hierarchy.ts` - extractGoalRelationships, validateBidirectionalLinks, validateNoCycles, validateGoalHierarchySections
- `lib/lint/validators/directory-validator.ts` - validateContentDirectoryFiles, validateDirectoryStructure
- `lib/lint/validators/types.ts` - Violation interface, GoalRelationships interface

After extraction, `lint-markdown.ts` becomes pure CLI orchestration, calling validators and reporting results.

## Consumers to Update

Remove backwards-compatible re-exports and update these files to import from new locations:

- `lib/test/test-utilities.ts` - imports from lint-markdown.ts
- `lib/cli/wire.ts` - imports from lint-markdown.ts
- `lib/cli/commands/list.ts` - imports from lint-markdown.ts

Note: `IDEA_TRANSITION_PREFIXES` and `titleToFilename` already live in `lib/workflow-tasks.ts`. The re-exports from lint-markdown.ts should be removed; consumers should import directly from workflow-tasks.ts.

## Goals

- [Maintainable Codebase](../goals/maintainable-codebase.md)
- [Intuitive Directory Structure](../goals/intuitive-directory-structure.md)
- [Decoupled Code](../goals/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- [ ] All validator functions extracted to `lib/lint/validators/`
- [ ] `lint-markdown.ts` contains only CLI orchestration logic
- [ ] No backwards-compatible re-exports remain
- [ ] All consumers updated to import from new locations
- [ ] All tests pass (both vitest and bun)
- [ ] No new lint violations introduced

# Extract lint-markdown god file

`lib/cli/commands/lint-markdown.ts` is now 1011 lines with 20+ exports. Some extraction has already occurred (`titleToFilename` moved to `lib/workflow-tasks.ts`, markdown utilities in `lib/markdown/markdown-utilities.ts`), but the file still mixes multiple concerns: individual validation functions, goal hierarchy graph algorithms, and CLI orchestration.

Splitting could look like:

- `lib/lint/validators/filename-validator.ts` - validateFilename, validateTitleFilenameMatch
- `lib/lint/validators/content-validator.ts` - validateOpeningSentence, validateOpeningSentenceLength, validateImperativeOpeningSentence, validateTaskHeadings
- `lib/lint/validators/link-validator.ts` - validateLinks, validateSemanticLinks, validateGoalHierarchyLinks
- `lib/lint/validators/idea-validator.ts` - validateIdeaOpenQuestions, validateIdeaTransitionTitle
- `lib/lint/validators/goal-hierarchy.ts` - extractGoalRelationships, validateBidirectionalLinks, validateNoCycles, validateGoalHierarchySections
- `lib/lint/validators/directory-validator.ts` - validateContentDirectoryFiles, validateDirectoryStructure

Then `lint-markdown.ts` becomes pure CLI orchestration, calling validators and reporting results.

## Open Questions

### Should backwards-compatible re-exports be maintained?

Currently `lint-markdown.ts` re-exports `IDEA_TRANSITION_PREFIXES`, `titleToFilename`, and `GlobScanner` for backwards compatibility. `lib/test/test-utilities.ts`, `lib/cli/wire.ts`, and `lib/cli/commands/list.ts` import from it.

#### Keep re-exports during transition

Avoid breaking downstream imports during the refactor. Update consumers gradually in follow-up tasks.

#### Remove re-exports immediately

Update all consumers in the same commit. Cleaner result but larger change.

### What directory structure should validators use?

The idea proposes `lib/lint/validators/` but there's no existing `lib/lint/` directory.

#### Use `lib/lint/validators/`

New namespace specific to linting concerns. Clear separation from CLI commands.

#### Use `lib/markdown/validators/`

Extends existing `lib/markdown/` directory. Validators are markdown-related.

#### Keep in `lib/cli/commands/validators/`

Stays close to the lint-markdown command that uses them.

### Should this be one task or multiple tasks?

The extraction is a significant refactor touching many files.

#### Single atomic task

One commit with all extractions. Maintains consistency but large change.

#### Sequential tasks per validator category

Smaller changes, easier to review. Risk of intermediate inconsistent states.

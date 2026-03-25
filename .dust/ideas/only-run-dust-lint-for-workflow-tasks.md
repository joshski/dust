# Only run `dust lint` for workflow tasks

When an agent works on a workflow task, run `dust lint` instead of `dust check` and restrict edits to `.dust/` files.

## Background

Workflow tasks manage the dust planning system itself rather than implementing code changes. They include:

- **capture** tasks - Research and create a new idea file
- **refine** tasks - Research and refine an existing idea
- **decompose** tasks - Break an idea into concrete implementation tasks
- **shelve** tasks - Archive and remove an idea

All non-`implement` task types are workflow tasks.

## Motivation

Workflow tasks only modify files within `.dust/` (ideas, tasks, facts, principles). Running the full `dust check` command for these tasks:

1. Wastes time running code linters, type checkers, and tests that won't catch any issues
2. May fail on unrelated code issues, blocking workflow task completion
3. Slows down the planning/refinement loop unnecessarily

## Current State

All artifact formatting and validation knowledge is already in `@joshski/dust`:

- **Artifact parsing**: `parseArtifact()` in `lib/artifacts/parsed-artifact.ts` knows the structure of all artifacts (title, opening sentence, sections, links)
- **Validation pipeline**: `parseArtifacts()` and `validateArtifacts()` in `lib/validation/validation-pipeline.ts` run all validators
- **Validators**: All specific validation rules are in `lib/lint/validators/` (content, filenames, links, principles, ideas, tasks, audits)
- **Public API**: The `@joshski/dust/validation` export exposes `validatePatch()` which uses the same validation as `dust lint`
- **Command implementation**: `lintMarkdown()` in `lib/cli/commands/lint-markdown.ts` orchestrates the validation

The artifact formatting knowledge is **not** duplicated in the CLI layer - the CLI commands already delegate to the library layer.

## Proposed Changes

### Modify git pre-push hook behavior

In `lib/cli/commands/pre-push.ts`, when the commits being pushed only contain `.dust/` file changes:

- Run `lintMarkdown()` instead of `check()` (both from `lib/cli/commands/`)
- Add a new `analyzeChangesForDustOnlyPattern()` function similar to the existing `analyzeChangesForTaskOnlyPattern()`

## Resolved Questions

### How should the pre-push hook determine whether to run `dust lint` or `dust check`?

**Decision:** Analyze changes for `.dust/`-only pattern

If all committed changes are within `.dust/`, run `lintMarkdown()` instead of `check()`. This is simpler than checking task titles and works for any `.dust/`-only commit.

**Pros:** Simple, no extra I/O, works with any `.dust/`-only commit
**Cons:** May skip full checks for a non-workflow task that only touched `.dust/` files (acceptable tradeoff since `.dust/` changes shouldn't affect code quality)

### What about mixed commits with both `.dust/` and code changes?

**Decision:** Run full check for any non-`.dust/` changes

Any code changes trigger full validation. This aligns with the "stop the line" principle and keeps validation behavior predictable. Workflow tasks should only touch `.dust/` files. If an agent is modifying both `.dust/` and code, they're either doing multiple tasks or making implementation changes that warrant full validation.

## Principle Alignment

This idea supports:

- **[Fast Feedback](../principles/fast-feedback.md)** - Workflow tasks complete faster without running irrelevant code checks
- **[Context Window Efficiency](../principles/context-window-efficiency.md)** - Less output from unnecessary checks means more efficient agent context usage
- **[Agent Autonomy](../principles/agent-autonomy.md)** - Workflow tasks can complete without being blocked by unrelated code issues

## Implementation Notes

Key file to modify:

**`lib/cli/commands/pre-push.ts`** - Add `.dust/`-only detection via `analyzeChangesForDustOnlyPattern()`, conditionally call `lintMarkdown()` instead of `check()`

The existing `analyzeChangesForTaskOnlyPattern()` in `pre-push.ts` can serve as a template for the new `analyzeChangesForDustOnlyPattern()` function that checks if all changes are within `.dust/`.

# Validate Artifact Sentence Length

The opening sentence of each artifact file is used in CLI commands (e.g., `dust list tasks`) to provide a summary. Currently there is no validation to ensure these sentences remain concise enough for terminal display.

Add a lint rule that validates the first sentence in any `.dust` artifact (goals, tasks, ideas, facts) is within a reasonable length limit (120 characters recommended, with a hard limit of 150 characters).

## Technical Details

- The opening sentence is extracted via `extractOpeningSentence()` in `lib/markdown/markdown-utilities.ts:29-98`
- It is displayed in CLI lists via `list.ts:178-191`
- There is already a `validateOpeningSentence()` function in `lib/cli/commands/lint-markdown.ts:86-98` that checks for presence of an opening sentence
- Add a new validation function `validateOpeningSentenceLength()` that checks the character count
- The validation should run during `dust lint markdown` for all content directories (goals, facts, ideas, tasks)
- Consider making the limit configurable in the future, but a hardcoded constant is sufficient for now

## Analysis of Current Artifacts

Current opening sentence lengths across 73 artifact files:
- Goals: 44-123 chars (average 78)
- Facts: 61-139 chars (average 91)
- Ideas: 46-189 chars (average 103)

A limit of 120 characters (soft) to 150 characters (hard) would capture 94% of existing artifacts while flagging outliers.

## Goals

- [Clarity over Brevity](../goals/clarity-over-brevity.md)
- [Fast Feedback](../goals/fast-feedback.md)
- [Maintainable Codebase](../goals/maintainable-codebase.md)

## Blocked by

(none)

## Definition of done

- [x] Add `validateOpeningSentenceLength()` function in `lib/cli/commands/lint-markdown.ts`
- [x] Define a `MAX_OPENING_SENTENCE_LENGTH` constant (150 characters)
- [x] Integrate the new validation into the `lintMarkdown()` function alongside existing `validateOpeningSentence()`
- [x] Add unit tests for the new validation function in `lib/cli/commands/lint-markdown.test.ts`
- [x] Verify any existing artifacts that exceed the limit are updated or the limit is adjusted
- [x] Run `dust lint markdown` to confirm the validation works

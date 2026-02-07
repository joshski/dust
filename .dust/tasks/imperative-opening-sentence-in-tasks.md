# Imperative Opening Sentence in Tasks

Encourage agents to write task opening sentences in imperative form by adding guidance to the task creation template and a lint rule.

Imperative form means the sentence reads as a command: "Add authentication to the login page." rather than "This task adds authentication to the login page." or "Authentication should be added to the login page." This matches how commit messages and issue titles are conventionally written, and produces more scannable task descriptions.

## Implementation

### Template change

In `lib/templates/agent-new-task.txt`, update step 6 from:

```
6. Write a comprehensive description of what needs to be done with technical details and references to relevant files
```

to:

```
6. Write a comprehensive description starting with an imperative opening sentence (e.g., "Add caching to the API layer." not "This task adds caching."). Include technical details and references to relevant files.
```

### Lint rule

Add a `validateImperativeOpeningSentence` function in `lib/cli/commands/lint-markdown.ts` that checks the opening sentence of task files only. The function should:

1. Extract the opening sentence using `extractOpeningSentence` from `lib/markdown/markdown-utilities.ts`
2. Check whether the first word is a common non-imperative pattern — specifically, flag sentences that start with:
   - Articles: "The", "A", "An"
   - Demonstratives: "This", "That", "These", "Those"
   - Pronouns: "We", "It", "They", "You", "I"
   - Gerunds (words ending in "-ing" as the first word, e.g., "Adding", "Implementing")
3. Return a `Violation` with a message like: `Opening sentence should use imperative form (e.g., "Add X" not "This adds X"). Found: "<first few words>..."`
4. Return `null` if the sentence passes or if there is no opening sentence (that case is already handled by `validateOpeningSentence`)

Call the new validator in the task-specific validation loop (around line 720 of `lint-markdown.ts`), alongside the existing `validateTaskHeadings` and `validateSemanticLinks` calls.

### Tests

Add tests in `lib/cli/commands/lint-markdown.test.ts` for the new function:

- Valid imperative sentences pass: "Add authentication to the login page.", "Replace the old caching layer.", "Fix the race condition in the worker pool."
- Non-imperative sentences fail: "This task adds authentication.", "Adding authentication to the login page.", "The authentication system needs updating.", "We need to add authentication."
- Sentences with no opening sentence return `null` (already handled elsewhere)

### Existing task files

Update `.dust/tasks/update-tagline.md` opening sentence from "Replace the dust tagline in \`lib/templates/help.txt\` and corresponding test assertions." — this already uses imperative form, so no change needed.

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md)
- [Consistent Naming](../goals/consistent-naming.md)

## Blocked By

(none)

## Definition of Done

- [ ] `lib/templates/agent-new-task.txt` step 6 mentions imperative form with an example
- [ ] `validateImperativeOpeningSentence` function exists in `lib/cli/commands/lint-markdown.ts`
- [ ] The function is called for task files during lint
- [ ] Tests cover both passing and failing cases in `lib/cli/commands/lint-markdown.test.ts`
- [ ] `bin/dust lint markdown` passes with the existing task file
- [ ] Existing tests pass

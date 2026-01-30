# Enforce opening sentences in dust files

Every markdown file in `.dust/` (goals, facts, ideas, tasks) must have a succinct opening sentence immediately after the H1 heading. This enables quick browsing - users can understand the gist of each file without reading the full content.

## What constitutes a good opening sentence

A valid opening sentence:
- Appears on the first non-blank line after the H1 heading
- Is a plain paragraph (not a heading, list item, or code block)
- Ends with sentence-ending punctuation (`.` `?` `!`)
- Is a single line (no line breaks within)
- Is concise (recommended: under 150 characters, but not enforced)

## Implementation

1. **Add `extractOpeningSentence` to `markdown-utilities.ts`**
   - Returns the first paragraph after the H1 heading, or null if invalid
   - Used by both display commands and validation

2. **Update `list` command (`list.ts`)**
   - Show relative path and opening sentence for each item
   - Format: `  .dust/goals/my-goal.md - Opening sentence here.`

3. **Update `next` command (`next.ts`)**
   - Already shows relative path, add opening sentence
   - Format: `  .dust/tasks/my-task.md - Opening sentence here.`

4. **Add validation in `validate.ts`**
   - Check all markdown files in goals/, facts/, ideas/, tasks/
   - Report violations when opening sentence is missing or malformed

## Goals

- [Progressive Disclosure](../goals/progressive-disclosure.md)
- [Context Window Efficiency](../goals/context-window-efficiency.md)

## Blocked by

(none)

## Definition of done

- [ ] `extractOpeningSentence` function exists in `markdown-utilities.ts` with tests
- [ ] `dust list` shows relative paths and opening sentences
- [ ] `dust next` shows opening sentences
- [ ] `dust validate` reports missing or malformed opening sentences
- [ ] All existing `.dust/` files have valid opening sentences
- [ ] Tests pass for all modified commands

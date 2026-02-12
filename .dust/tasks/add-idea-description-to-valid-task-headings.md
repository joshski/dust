# Add Idea Description to valid task headings

Update the markdown linter in `lib/cli/commands/lint-markdown.ts` to accept `## Idea Description` as a valid heading in task files. This allows capture idea tasks to use the new format without failing lint.

## Goals

- [Lint Everything](../goals/lint-everything.md)

## Blocked By

(none)

## Definition of Done

- [ ] `## Idea Description` is a valid task heading in lint-markdown.ts
- [ ] Capture idea tasks with the new format pass lint
- [ ] `bin/dust check` passes

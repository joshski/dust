# Expose listIdeas From Dust Library

Add a `listIdeas()` function to `@joshski/dust` that takes cached file data and returns the full ideas list. This includes pending ideas from capture-idea tasks.

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] `listIdeas(files: { path: string; content: string }[])` is exported from `@joshski/dust/workflow-tasks`
- [ ] Returns ready ideas from `.dust/ideas/*.md` with title extracted from content
- [ ] Returns pending ideas from `.dust/tasks/` capture-idea tasks that don't yet have a corresponding idea file
- [ ] Pending ideas are distinguishable from ready ideas in the return type (e.g. status field)
- [ ] Consumers do not need to inspect markdown structure or title prefixes to identify pending ideas

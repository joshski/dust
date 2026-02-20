# Decompose Idea: Bucket asset upload

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Review `.dust/principles/` to link relevant principles and `.dust/facts/` for design decisions that should inform the task. See [Bucket asset upload](../ideas/bucket-asset-upload.md).

The server should just take the stream of bytes and respond with a JSON object that includes the public (but obscure) URL

## Resolved Questions

### Should assets be scoped to a repository or user-global?

**Decision:** Repository-scoped assets

### What file types and size limits should be enforced?

**Decision:** Both client and server validation

### Should the URL be permanent or time-limited?

**Decision:** Permanent public URLs

### How should name collisions be handled?

**Decision:** Generate unique IDs for all uploads

### Should there be a way to list or delete uploaded assets?

**Decision:** Upload-only initially


## Principles

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope

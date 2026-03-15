# Skip tasks missing required headings in next queue

Prevent malformed task files from being selected by the task queue by validating required headings before blocker evaluation.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Stop the Line](../principles/stop-the-line.md)
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md)

## Blocked By

(none)

## Definition of Done

- [ ] `findUnblockedTasks` excludes task files that fail required-heading validation (`## Blocked By`, `## Definition of Done`)
- [ ] Queue selection treats skipped invalid tasks as unavailable work (if every task is invalid, no task is returned)
- [ ] Unit tests cover mixed queues (valid + invalid), all-invalid queues, and existing blocker behavior for valid tasks

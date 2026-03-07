# Print Failure Details Immediately in dust check Progressive Output

After progressive status output exists, print failure detail blocks immediately when each failed check becomes displayable.

## Principles

- [Fast Feedback Loops](../principles/fast-feedback-loops.md)
- [Actionable Errors](../principles/actionable-errors.md)
- [Unsurprising UX](../principles/unsurprising-ux.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Small Units](../principles/small-units.md)

## Facts

- [Task File Format](../facts/task-file-format.md)
- [Workflow Task Transitions](../facts/workflow-task-transitions.md)

## Blocked By

- [Progressive Ordered Status Output for dust check](./progressive-ordered-status-output-for-dust-check.md)

## Definition of Done

- [ ] When a check fails, its command/output/hints block is printed immediately after that check's status block.
- [ ] Failure detail blocks appear only once and are not deferred to a separate final pass.
- [ ] Multiple failures still print in deterministic display order.
- [ ] Final summary behavior is unchanged.
- [ ] Tests cover immediate failure detail emission for parallel completion scenarios.

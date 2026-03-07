# Progressive Ordered Status Output for dust check

Replace dot progress with progressive per-check status output that streams in deterministic display order as checks complete.

## Principles

- [Fast Feedback Loops](../principles/fast-feedback-loops.md)
- [Slow Feedback Coping](../principles/slow-feedback-coping.md)
- [Unsurprising UX](../principles/unsurprising-ux.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Small Units](../principles/small-units.md)

## Facts

- [Task File Format](../facts/task-file-format.md)
- [Workflow Task Transitions](../facts/workflow-task-transitions.md)

## Blocked By

(none)

## Definition of Done

- [ ] `dust check` no longer prints progress dots while checks are running.
- [ ] `dust check` prints status lines progressively as checks complete in deterministic display order.
- [ ] Built-in `dust lint` remains first in display ordering when `.dust/` exists.
- [ ] Final summary line still prints once all checks finish.
- [ ] Ordering/flush behavior is covered by tests, including out-of-order completion in parallel mode.
- [ ] The implementation isolates ordering/flush logic in a pure helper and keeps terminal I/O in the command shell path.

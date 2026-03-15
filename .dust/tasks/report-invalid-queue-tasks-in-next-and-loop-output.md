# Report invalid queue tasks in next and loop output

Surface clear diagnostics for tasks skipped by queue validation so operators can fix malformed files quickly.

## Principles

- [Actionable Errors](../principles/actionable-errors.md)
- [Unsurprising UX](../principles/unsurprising-ux.md)
- [Development Traceability](../principles/development-traceability.md)

## Blocked By

(none)

## Definition of Done

- [ ] `dust next` output includes a dedicated invalid/skipped section with each skipped task path and required-heading validation messages
- [ ] `dust loop` logs skipped invalid tasks when no valid work is available so stalling is diagnosable
- [ ] Tests verify output for one invalid task and multiple invalid tasks without regressing existing success-path output

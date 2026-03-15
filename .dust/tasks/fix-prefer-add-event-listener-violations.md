# Fix prefer-add-event-listener Violations

Replace `on*` property assignments with `addEventListener()` calls. This fixes violations of oxlint's `prefer-add-event-listener` rule.

## Context

The `prefer-add-event-listener` rule flags 15 violations. Using `addEventListener()` over `on*` properties is preferred because:
- Multiple listeners can be attached to the same event
- Options like `once`, `capture`, and `passive` are available
- The pattern is more consistent and discoverable

Violations appear in:
- WebSocket event handlers (`ws.onmessage = ...`)
- Process event handlers (`process.onmessage = ...`)
- Test mocks

## Approach

1. Run `bunx oxlint -D suspicious --filter prefer-add-event-listener` to list all violations
2. For each violation, replace `obj.onevent = handler` with `obj.addEventListener('event', handler)`
3. Run `bin/dust check` to verify tests still pass
4. Run `bunx oxlint -D suspicious --filter prefer-add-event-listener` to confirm zero violations

## Principles

- [Lint Everything](../principles/lint-everything.md)
- [Stop the Line](../principles/stop-the-line.md)

## Blocked By

(none)

## Definition of Done

- [ ] All `on*` property assignments replaced with `addEventListener()` calls where flagged
- [ ] `bunx oxlint -D suspicious --filter prefer-add-event-listener` reports zero violations
- [ ] `bin/dust check` passes

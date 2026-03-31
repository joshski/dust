# Update Connection Replacement Logic for Machine ID

Modify the connection replacement behavior (close code 4000) to consider machine IDs. This allows multiple connections per user from different machines while still replacing connections from the same machine.

## Context

Currently, new bucket worker connections replace all existing connections for a user (close code 4000). With machine IDs in the protocol, we can be more intelligent: connections from different machines should coexist, while connections from the same machine should replace each other.

## What to Build

Update connection replacement logic in `lib/bucket/bucket-state.ts` (around lines 525-577):

1. **Same Machine Replacement**: If new connection has `machineId` matching an existing connection's `machineId`, close the old connection with code 4000
2. **Different Machine Coexistence**: If new connection has `machineId` different from all existing connections, allow it to coexist
3. **Legacy Behavior**: If new connection lacks `machineId`, use current behavior (replace all existing connections for user)
4. **Mixed Scenario**: Existing connections without `machineId` are replaced by any new connection

## Acceptance Criteria

- Connection with `machineId: "laptop"` replaces existing connection with `machineId: "laptop"`
- Connection with `machineId: "laptop"` coexists with connection with `machineId: "desktop"`
- Connection without `machineId` replaces all existing connections (backward compatible)
- New connection with `machineId` coexists with old connections lacking `machineId`
- Close code 4000 is only sent when replacing same-machine connection
- Unit tests cover all replacement scenarios
- Integration test verifies multi-machine connection coexistence

## Principles

- [Make Changes with Confidence](../principles/make-changes-with-confidence.md) - Comprehensive tests prevent regression
- [Unsurprising UX](../principles/unsurprising-ux.md) - Behavior matches user mental model (same machine = replace, different machine = coexist)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Pure connection comparison logic

## Related Facts

- [Bucket Protocol](../facts/bucket-protocol.md)

## Task Type

implement

## Blocked By

- [Extend Connection Init with Machine ID](extend-connection-init-with-machine-id.md)

## Repository Hints

Really think about "Functional Core, Imperative Shell"

## Definition of Done

- Implementation complete with tests passing
- Task file deleted in the commit
- Changes to facts updated if applicable

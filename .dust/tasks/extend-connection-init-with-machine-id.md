# Extend Connection Init with Machine ID

Add optional `machineId` field to `connection-init` message and include discovered machine ID in bucket worker connections.

## Context

The bucket protocol's `connection-init` message currently identifies clients by user credentials but cannot distinguish multiple machines. Adding machine ID to the protocol enables per-machine connection tracking.

## What to Build

1. **Protocol Extension** (lib/bucket/server-messages.ts):
   - Add `machineId?: string` to `ConnectionInitMessage` interface
   - Update `buildConnectionInitPayload()` to accept optional `machineId` parameter
   - Update tests to verify `machineId` serialization/deserialization

2. **Include Machine ID** (lib/bucket/native-io.ts):
   - Update `defaultBuildConnectionInit()` to call `getMachineId(io)`
   - Include result in `buildConnectionInitPayload()` call
   - Machine ID discovery runs in parallel with version/platform/git/agents discovery

3. **Wire to Worker** (lib/cli/commands/bucket-worker.ts):
   - Pass `--machine-id` flag value (if provided) to connection initialization
   - No interactive prompts - flag writes to file, discovery reads from file

## Acceptance Criteria

- `ConnectionInitMessage.machineId` is optional (backward compatible)
- `buildConnectionInitPayload()` accepts and includes `machineId` parameter
- `defaultBuildConnectionInit()` discovers and includes machine ID automatically
- Connection-init messages include machine ID when available
- Tests verify message format with and without machine ID
- Integration test confirms real connection sends machine ID

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Pure message building, IO-based discovery
- [Unsurprising UX](../principles/unsurprising-ux.md) - Optional field maintains backward compatibility
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md) - Comprehensive tests for protocol changes

## Related Facts

- [Bucket Protocol](../facts/bucket-protocol.md)

## Task Type

implement

## Blocked By

- [Add Machine ID Storage and Discovery](add-machine-id-storage-and-discovery.md)

## Repository Hints

Really think about "Functional Core, Imperative Shell"

## Definition of Done

- Implementation complete with tests passing
- Task file deleted in the commit
- Changes to facts updated if applicable

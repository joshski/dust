# Add Machine ID Storage and Discovery

Implement storage and discovery of a stable machine identifier for bucket worker connections. This enables the protocol to distinguish multiple simultaneous connections from the same user across different machines.

## Context

The bucket protocol needs to identify individual machines to support multiple simultaneous connections per user. Machine IDs should be user-friendly, stable across sessions, and configurable.

## What to Build

Add machine ID storage and discovery in `lib/bucket/native-io.ts`:

1. **Storage Format**: `~/.dust/machine-id` contains a single line with the machine name
2. **Discovery Function**: `getMachineId(io: IO): Promise<string>`
   - Check `DUST_MACHINE_ID` environment variable first
   - Then check `~/.dust/machine-id` file
   - Fall back to `os.hostname()` if neither exists
   - Return trimmed, non-empty string

3. **CLI Flag**: Add `--machine-id <name>` option to `dust bucket worker` command
   - Flag overrides environment variable and stored file
   - Store user-provided value in `~/.dust/machine-id` for future sessions
   - Validate: trim whitespace, reject empty strings after trimming

## Acceptance Criteria

- `getMachineId(io)` returns value from env var if `DUST_MACHINE_ID` is set
- `getMachineId(io)` returns value from `~/.dust/machine-id` if file exists
- `getMachineId(io)` returns `os.hostname()` if neither env var nor file exists
- `--machine-id` flag writes value to `~/.dust/machine-id`
- Empty or whitespace-only machine IDs are rejected with clear error message
- Unit tests cover all precedence cases (env > file > hostname)
- Integration test verifies file persistence across `getMachineId()` calls

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Pure discovery logic, side effects in IO layer
- [Unsurprising UX](../principles/unsurprising-ux.md) - Standard precedence: env var > flag > file > default
- [Easy Adoption](../principles/easy-adoption.md) - Works out of the box with sensible hostname default
- [Actionable Errors](../principles/actionable-errors.md) - Clear message when machine ID validation fails

## Related Facts

- [Bucket Protocol](../facts/bucket-protocol.md)

## Task Type

implement

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"

## Definition of Done

- Implementation complete with tests passing
- Task file deleted in the commit
- Changes to facts updated if applicable

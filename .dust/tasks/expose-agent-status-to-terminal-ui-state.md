# Expose agent status to terminal UI state

Add an `agentStatuses` map to `TerminalUIState` and wire it up in the bucket command. This gives the terminal UI renderer access to each repository's agent status.

## Change Details

In `lib/bucket/terminal-ui.ts`:

1. Add `agentStatuses: Map<string, 'idle' | 'busy'>` to `TerminalUIState`.
2. Initialize it as an empty map in `createTerminalUIState()`.
3. Populate entries in `addRepository()` (default `'idle'`) and remove them in `removeRepository()`.

In `lib/cli/commands/bucket.ts`:

4. When agent events arrive for a repository, update `state.ui.agentStatuses` with the new status derived from `RepositoryState.agentStatus`.

## Goals

- [Decoupled Code](../goals/decoupled-code.md)
- [Unsurprising UX](../goals/unsurprising-ux.md)

## Blocked By

(none)

## Definition of Done

- [ ] `TerminalUIState` has an `agentStatuses` map
- [ ] `addRepository()` initializes status to `'idle'`
- [ ] `removeRepository()` removes the status entry
- [ ] Bucket command updates the map when agent events arrive
- [ ] Tests cover the state management functions
- [ ] `bin/dust check` passes

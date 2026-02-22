# Add Typed Server Messages

Define TypeScript interfaces for server-to-client WebSocket messages in the bucket protocol, replacing dynamic parsing with typed message handling.

## Background

The WebSocket handler in `lib/cli/commands/bucket.ts:596-718` parses two message types dynamically:
- `repository-list` — contains a `repositories` array
- `task-available` — contains a `repository` string

The current implementation relies on runtime checks like `message.type === 'repository-list'` with no compile-time verification. Adding typed interfaces catches typos and provides IDE autocomplete.

## Implementation

1. Create a `ServerMessage` discriminated union in `lib/bucket/server-messages.ts`:
   ```typescript
   interface RepositoryListMessage {
     type: 'repository-list'
     repositories: RepositoryData[]
   }

   interface TaskAvailableMessage {
     type: 'task-available'
     repository: string
   }

   type ServerMessage = RepositoryListMessage | TaskAvailableMessage
   ```

2. Add a `parseServerMessage` function that returns `ServerMessage | null` for invalid messages

3. Update `lib/cli/commands/bucket.ts` to use the typed interfaces

## Principles

- [Decoupled Code](../principles/decoupled-code.md)
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md)

## Blocked By

(none)

## Definition of Done

- [ ] `ServerMessage` type exists with `RepositoryListMessage` and `TaskAvailableMessage` variants
- [ ] `parseServerMessage` function validates and narrows message types
- [ ] `lib/cli/commands/bucket.ts` uses the typed message parsing
- [ ] Tests verify message parsing for valid and invalid messages
- [ ] All checks pass (`bin/dust check`)

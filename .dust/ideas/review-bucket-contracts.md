# Review bucket contracts

The bucket protocol involves several interfaces and contracts, some explicit and some implicit. This idea explores whether the contracts are clear enough for implementers and whether additional type exports would help.

## Current State

### Server-to-Client Message Types

The WebSocket handler in `lib/cli/commands/bucket.ts:596-718` parses two message types:
- `repository-list` — contains a `repositories` array
- `task-available` — contains a `repository` string

These message types are parsed dynamically with no TypeScript interface defining their shape. The parsing relies on runtime checks like `message.type === 'repository-list'` and `typeof repoName === 'string'`.

### Repository Data Parsing

The `parseRepository` function in `lib/bucket/repository.ts:138-172` validates incoming repository data with runtime checks. It accepts either a string (treated as both name and gitUrl) or an object with `name`, `gitUrl`, and optional `url` and `id` fields.

The `Repository` interface at `lib/bucket/repository.ts:45-50` defines the shape but is not exported from the public package API.

### Internal Interfaces

Several interfaces define contracts between internal components:

| Interface | Location | Purpose |
|-----------|----------|---------|
| `Repository` | `lib/bucket/repository.ts:45` | Repository metadata (name, gitUrl, url, id) |
| `RepositoryState` | `lib/bucket/repository.ts:52` | Runtime state per repository (path, loopPromise, agentStatus) |
| `RepositoryManager` | `lib/bucket/repository.ts:68` | Subset of bucket state needed by repository management |
| `RepositoryDependencies` | `lib/bucket/repository.ts:76` | Injectable dependencies for repository operations |
| `BucketDependencies` | `lib/cli/commands/bucket.ts:78` | Injectable dependencies for the bucket command |

### Exported Types

The `lib/types.ts` file exports event protocol types (`AgentSessionEvent`, `EventMessage`) but no bucket-specific types. This is intentional—the bucket command is a dust internal, not a public API for external consumers.

### Event Types (Client-to-Server)

The `EventMessage` interface in `lib/agent-events.ts:27-34` is well-defined and exported. Client-to-server events conform to this contract and are sent via the `SendEventFn` type.

## Potential Improvements

### Typed Server Messages

Define TypeScript interfaces for server-to-client WebSocket messages:

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

This would allow TypeScript to catch typos and provide autocomplete when handling messages.

### Export Repository Type

The `Repository` interface could be exported via `@joshski/dust/types` for consumers building dustbucket servers or alternative bucket implementations.

### Type Guards for Message Parsing

Add type guards to replace inline runtime checks:

```typescript
function isRepositoryListMessage(msg: unknown): msg is RepositoryListMessage { ... }
function isTaskAvailableMessage(msg: unknown): msg is TaskAvailableMessage { ... }
```

## Related Principles

- [Dependency Injection](../principles/dependency-injection.md) — bucket dependencies are already well-injected
- [Decoupled Code](../principles/decoupled-code.md) — interfaces define explicit contracts between modules

## Related Ideas

- [Increase type safety](increase-type-safety.md) — broader type safety improvements
- [Review error handling](review-error-handling.md) — message parsing error handling

## Open Questions

### Should server message types be formalized in TypeScript?

#### Define explicit TypeScript interfaces for server messages

Create a `ServerMessage` discriminated union with specific types for each message kind. Use type guards to validate and narrow message types. This catches typos at compile time and provides IDE autocomplete.

Benefits: Compile-time type checking; clear documentation of the protocol; IDE support for message fields.

Costs: Requires maintaining types that mirror the server's actual messages; the server is a separate codebase (dustbucket), so types could drift.

#### Keep dynamic parsing with runtime checks

The current approach is flexible and handles unexpected message shapes gracefully. The server protocol is not public API—it's an internal contract between dust and dustbucket.

Benefits: No maintenance burden for types; resilient to protocol changes.

Costs: No compile-time checking; easy to make typos in field names.

### Should the Repository interface be exported publicly?

#### Export Repository via @joshski/dust/types

Allows external consumers (e.g., alternative dustbucket implementations) to build conformant repository data. Makes the contract explicit and discoverable.

Benefits: Clear contract for implementers; enables typed integrations.

Costs: Creates a public API commitment; changes require semver consideration.

#### Keep Repository as an internal type

The bucket protocol is an internal implementation detail between dust and dustbucket. External consumers have no documented need for these types.

Benefits: No public API commitment; free to change internals.

Costs: Alternative implementations must discover the contract by reading source code.

### Should implementer documentation be added?

#### Add a fact file documenting the bucket protocol

Create `.dust/facts/bucket-protocol.md` documenting the WebSocket message format, expected server behavior, and client responsibilities. This serves as the "contract" for implementers.

Benefits: Clear documentation for anyone implementing a bucket server; single source of truth.

Costs: Documentation must be kept in sync with code; adds maintenance burden.

#### Rely on code as documentation

The source code in `lib/cli/commands/bucket.ts` and `lib/bucket/` serves as the authoritative documentation. Implementers can read the code to understand the protocol.

Benefits: No additional documentation to maintain; code is always accurate.

Costs: Higher barrier to understanding; requires reading implementation details.

# Document Bucket Protocol

Create a fact file documenting the bucket protocol for implementers of dustbucket servers.

## Background

The bucket protocol involves server-to-client messages, client-to-server events, and repository management semantics. Currently, implementers must read source code in `lib/cli/commands/bucket.ts` and `lib/bucket/` to understand the contract. A fact file provides a single source of truth.

## Implementation

Create `.dust/facts/bucket-protocol.md` documenting:

1. **WebSocket connection** — URL format, authentication, reconnection behavior
2. **Server-to-client messages** — `repository-list` and `task-available` message formats
3. **Client-to-server events** — reference to [Dust Event Protocol](../facts/dust-event-protocol.md)
4. **Repository data format** — required and optional fields (name, gitUrl, url, id, hasTask)
5. **Expected server behavior** — when to send `task-available`, how to handle events

## Principles

- [Traceable Decisions](../principles/traceable-decisions.md)
- [Clarity Over Brevity](../principles/clarity-over-brevity.md)

## Blocked By

(none)

## Definition of Done

- [ ] `.dust/facts/bucket-protocol.md` exists with complete protocol documentation
- [ ] Markdown lint passes (`bin/dust check`)
- [ ] Cross-references to related facts are included

# Remove emitRawEvents setting

Always emit raw Claude events over the wire protocol when `eventsUrl` is configured, removing the need for separate `emitRawEvents` configuration.

Currently raw Claude events (deltas, content blocks, etc.) are only emitted when `emitRawEvents: true` is explicitly set. This adds unnecessary configuration complexity - if someone configures `eventsUrl`, they want all the events.

## Files to change

- `lib/cli/types.ts` - Remove `emitRawEvents` from `DustSettings` interface
- `lib/config/settings.ts` - Remove `emitRawEvents` from settings loading
- `lib/cli/commands/loop.ts` - Always create `onRawEvent` callback when `eventsUrl` is configured (around line 277-282)
- `lib/cli/commands/loop.test.ts` - Update tests that reference `emitRawEvents`
- `.dust/facts/dust-event-protocol.md` - Remove references to `emitRawEvents` setting

## Goals

- [Easy Adoption](../goals/easy-adoption.md)

## Blocked by

(none)

## Definition of done

- [ ] `emitRawEvents` removed from `DustSettings` interface
- [ ] Raw events are emitted automatically when `eventsUrl` is set
- [ ] Tests updated and passing
- [ ] Documentation updated

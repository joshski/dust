# Log Bucket Loop Errors

Replace the error-swallowing pattern in `bucket.ts` with `Promise.allSettled` to log errors from repository loops.

## Context

At `lib/cli/commands/bucket.ts:737`, repository loop errors are completely swallowed:

```typescript
await Promise.all(loopPromises.map(p => p.catch(() => {})))
```

If a loop fails (agent crash, filesystem error, etc.), the failure is invisible to operators monitoring the bucket.

## Change Required

Use `Promise.allSettled` and log rejected promises:

```typescript
const results = await Promise.allSettled(loopPromises)
for (const result of results) {
  if (result.status === 'rejected') {
    logMessage(context, `Repository loop failed: ${result.reason}`)
  }
}
```

This preserves the current behavior of continuing cleanup even when loops fail, while making failures visible.

## Principles

- [Debugging Tooling](../principles/debugging-tooling.md) - agents need readable, structured error output
- [Stop the Line](../principles/stop-the-line.md) - problems should be fixed at source, not hidden

## Blocked By

(none)

## Definition of Done

- [ ] `Promise.all(...catch)` replaced with `Promise.allSettled`
- [ ] Rejected promises are logged using the existing `logMessage` function
- [ ] `bin/dust check` passes

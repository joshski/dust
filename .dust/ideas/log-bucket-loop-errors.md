# Log bucket loop errors

Replace the error-swallowing `.catch(() => {})` pattern in `bucket.ts` with `Promise.allSettled` to log errors from repository loops.

## Current Behavior

At `lib/cli/commands/bucket.ts:737`:
```typescript
await Promise.all(loopPromises.map(p => p.catch(() => {})))
```

Repository loop errors are completely swallowed. If a loop fails for any reason (agent crash, filesystem error, etc.), the failure is invisible to operators monitoring the bucket.

## Proposed Fix

Use `Promise.allSettled` and log rejected promises:
```typescript
const results = await Promise.allSettled(loopPromises)
for (const result of results) {
  if (result.status === 'rejected') {
    // Log the error - could use logMessage() or debug logging
  }
}
```

This preserves the current behavior of continuing cleanup even when loops fail, while making failures visible.

## Related Ideas

- [Review error handling](review-error-handling.md) - documents this and other error handling issues
- [Establish consistent error handling](establish-consistent-error-handling.md) - error handling conventions

## Related Principles

- [Debugging Tooling](../principles/debugging-tooling.md) - agents need readable, structured error output
- [Stop the Line](../principles/stop-the-line.md) - problems should be fixed at source, not hidden

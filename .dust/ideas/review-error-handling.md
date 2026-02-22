# Review error handling

Audit the codebase for error handling issues.

**Note:** A repeatable audit for error handling is now available: `bin/dust audit error-handling`. This idea documents findings from a one-time manual review.

## Findings

### Silently Swallowed Errors

1. **`lib/cli/commands/bucket.ts:679`** - Empty catch in Promise.all
   ```typescript
   await Promise.all(loopPromises.map(p => p.catch(() => {})))
   ```
   Repository loop errors are completely swallowed with no logging.

2. **`lib/claude/spawn-claude-code.ts:83-87`** - Empty catch for JSON parsing
   ```typescript
   try {
     yield JSON.parse(line) as RawEvent
   } catch {
     // Skip malformed JSON lines
   }
   ```
   Malformed JSON is silently skipped without logging.

3. **`lib/codex/spawn-codex.ts:42-46`** - Same pattern as spawn-claude-code.

4. **`lib/cli/commands/loop.ts:47-54`** - Silent fallback when loading package.json
   ```typescript
   catch {
     // try next candidate
   }
   ```
   Returns 'unknown' if all candidates fail, with no indication something went wrong.

### Timing and Race Conditions

5. **`lib/codex/spawn-codex.ts:49-53`** - stderr capture happens AFTER the async iteration
   stderr listener is attached after the for-await loop completes, meaning stderr during stdout processing is not captured. This contrasts with `spawn-claude-code.ts` which captures stderr eagerly before iterating.

6. **`lib/bucket/repository-git.ts:38-45`** - close event may fire before stderr is fully buffered
   ```typescript
   proc.on('close', code => {
     // stderr may still be arriving
     context.stderr(`Failed to clone ${repository.name}: ${stderr.trim()}`)
   })
   ```

### Missing Error Context

7. **`lib/bucket/repository-git.ts:47-50`** - Errors converted to boolean lose details
   ```typescript
   proc.on('error', error => {
     context.stderr(`...`)
     resolve(false)  // Caller can't distinguish failure modes
   })
   ```

8. **`lib/cli/commands/bucket.ts:550`** - WebSocket JSON parse errors caught but not handled
   If `JSON.parse(event.data)` fails in the `onmessage` handler, the error is caught but never logged or handled.

### Fire-and-Forget Promises

9. **`lib/cli/commands/loop.ts:219`** - Event posting with minimal error handling
   ```typescript
   postEvent(eventsUrl, payload).catch(onError)
   ```
   Events can be silently lost if posting fails repeatedly.

## Suggested Fixes

- Add debug-level logging to catch blocks that intentionally skip errors
- Fix stderr capture timing in `spawn-codex.ts` to match `spawn-claude-code.ts`
- Use `Promise.allSettled` instead of swallowing errors in `bucket.ts`
- Add error logging in the WebSocket message handler
- Consider retry logic for event posting failures

## Related Principles

- [Actionable Errors](../principles/actionable-errors.md) - error messages should tell you what to do next
- [Debugging Tooling](../principles/debugging-tooling.md) - agents need readable, structured error output
- [Stop the Line](../principles/stop-the-line.md) - problems should be fixed at source, not hidden

## Related Ideas

- [Establish consistent error handling](establish-consistent-error-handling.md) - documenting error handling conventions

## Open Questions

### Should malformed JSON from agent processes be logged?

#### Yes, log malformed JSON

Helps debug protocol errors and malformed agent output. Makes silent failures visible.

#### No, continue silently skipping

Avoids noisy output if the agent emits non-JSON diagnostic messages to stdout.

### What granularity for error recovery?

#### Log all errors, continue operation

Failed operations are logged even if the overall command continues. Provides visibility without blocking.

#### Fail fast on first error

Stop the operation immediately when any error occurs. Aligns with "Stop the Line" principle.


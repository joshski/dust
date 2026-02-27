# Review error handling

Audit the codebase for error handling issues.

**Note:** A repeatable audit for error handling is now available: `bin/dust audit error-handling`. This idea documents findings from a one-time manual review.

## Findings

### Silently Swallowed Errors

1. **`lib/cli/commands/bucket.ts:737`** - Empty catch in Promise.all
   ```typescript
   await Promise.all(loopPromises.map(p => p.catch(() => {})))
   ```
   Repository loop errors are completely swallowed with no logging.

2. **`lib/claude/spawn-claude-code.ts:112`** - Empty catch for JSON parsing
   ```typescript
   try {
     yield JSON.parse(line) as RawEvent
   } catch {
     // Skip malformed JSON lines
   }
   ```
   Malformed JSON is silently skipped without logging.

3. **`lib/codex/spawn-codex.ts:76`** - Same pattern as spawn-claude-code.

### Missing Error Context

4. **`lib/bucket/repository-git.ts:48-50`** - Errors converted to boolean lose details
   ```typescript
   proc.on('error', error => {
     context.stderr(`...`)
     resolve(false)  // Caller can't distinguish failure modes
   })
   ```

### Resolved Issues

The following issues from the original audit have been addressed:

- ~~`spawn-codex.ts` stderr timing~~ - Now captures stderr eagerly before iterating, matching `spawn-claude-code.ts`
- ~~`bucket.ts` WebSocket JSON parse~~ - Now logs parse failures at line 603-610
- ~~`loop.ts` package.json loading~~ - Code has been refactored

## Suggested Fixes

- Add debug-level logging to catch blocks that intentionally skip errors
- Use `Promise.allSettled` instead of swallowing errors in `bucket.ts`

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


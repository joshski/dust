# Audit: Error Handling

Review error handling patterns for consistency and agent-friendliness.

Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically, then create new idea files in `./.dust/ideas/` for any issues you identify, avoiding duplication.

## Scope

Focus on these areas:

1. **Silently swallowed errors** - Empty catch blocks, `.catch(() => {})`, errors caught but not logged or re-thrown
2. **Missing error context** - Errors converted to booleans or generic messages that lose details
3. **Fire-and-forget promises** - Promises without `.catch()` or `await` that may fail silently
4. **Non-actionable error messages** - Error messages that say what went wrong but not how to fix it
5. **Inconsistent error recovery** - Similar error scenarios handled differently across the codebase

## Analysis Steps

1. Search for empty catch blocks: `catch {}`, `catch () {}`, `.catch(() => {})`
2. Look for patterns that discard error details: `catch { return false }`, `catch { return null }`
3. Find promises without error handling: unassigned or not-awaited promises
4. Review error messages in `throw` statements and `context.stderr()` calls for actionability
5. Compare error handling patterns across similar operations for consistency

## Output

For each error handling issue identified, provide:
- **Location** - File path and line number
- **Pattern** - Which category of issue (swallowed, missing context, fire-and-forget, etc.)
- **Impact** - What failures could go unnoticed or be hard to debug
- **Suggestion** - Specific fix (add logging, propagate error, add recovery guidance)

## Principles

- [Actionable Errors](../principles/actionable-errors.md) - Error messages should tell you what to do next
- [Debugging Tooling](../principles/debugging-tooling.md) - Agents need readable, structured error output
- [Stop the Line](../principles/stop-the-line.md) - Problems should be fixed at source, not hidden

## Blocked By

(none)

## Definition of Done

- [ ] Searched for empty catch blocks and silent error swallowing
- [ ] Identified patterns that discard error details
- [ ] Found fire-and-forget promises without error handling
- [ ] Reviewed error messages for actionability
- [ ] Compared error handling consistency across similar operations
- [ ] Proposed ideas for any error handling improvements identified
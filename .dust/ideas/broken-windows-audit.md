# Broken Windows Audit

Add a stock audit that identifies "broken windows" in the codebase. These include unfinished work, technical debt markers, and other signals that quality has degraded.

## Context

The "broken-windows" principle states that we should not leave broken windows unrepaired. Visible markers of incomplete work or degraded quality send a signal that quality doesn't matter, which can accelerate decay.

The "boy-scout-rule" principle complements this: always leave the code better than you found it.

Currently, there is no stock audit to systematically identify these quality signals. Common broken windows include:
- TODO/FIXME/HACK comments
- Commented-out code
- Skipped or disabled tests
- Console.log debugging statements
- Temporary file markers (.tmp, .backup, etc.)
- Empty catch blocks
- Magic numbers without explanation
- Dead imports or unused variables

## Proposed Audit

Create a `broken-windows` stock audit in `lib/audits/stock-audits.ts` that:

1. **Searches for quality debt markers**:
   - TODO, FIXME, HACK, XXX comments
   - Commented-out code blocks
   - `.skip()`, `.only()`, or disabled test cases
   - `console.log()`, `print()`, `debugger` statements
   - Empty catch blocks that swallow errors
   - Files with `.tmp`, `.backup`, `.old` in their names
   - Unreachable code after early returns
   - Unused imports or variables (if linting doesn't catch them)

2. **Categorizes by urgency**:
   - **Critical**: Disabled tests, swallowed errors, debugger statements
   - **High**: TODO/FIXME without issue links, commented-out code
   - **Medium**: Generic TODO comments, magic numbers
   - **Low**: Debug logging in non-debug code

3. **Provides context**:
   - How long has the broken window existed? (via git blame)
   - Is there a pattern of broken windows in certain areas?
   - Are some types of debt accumulating faster than being fixed?

## Related Principles

- **broken-windows** - Primary principle this audit enforces
- **boy-scout-rule** - Encourages cleaning up what you find
- **stop-the-line** - Halt and fix problems when detected
- **repository-hygiene** - Maintain a clean, organized state
- **actionable-errors** - Empty catch blocks violate this

## Example Patterns to Detect

```javascript
// TODO comments without context
// TODO: fix this

// FIXME with context (better, but still debt)
// FIXME: Handle edge case when user is deleted mid-request (see issue #123)

// Commented-out code
// const oldImplementation = () => {
//   return legacyLogic()
// }

// Skipped tests
test.skip('should handle errors', () => { ... })

// Debug artifacts
console.log('DEBUG: user =', user)
debugger

// Swallowed errors
try {
  dangerousOperation()
} catch (e) {
  // do nothing
}

// Magic numbers
if (retries > 3) { ... }  // Why 3? What does it represent?
```

## Output Format

For each broken window found, create ideas containing:
- Type of broken window (TODO, skipped test, etc.)
- Location and context
- Age (how long it's been there)
- Severity/priority
- Suggested action (fix, document, or remove)
- Related broken windows (patterns in the same area)

## Open Questions

### Should all TODO comments be considered broken windows?

#### Option: All TODOs are technical debt

Flag all TODO/FIXME/HACK comments without exception.

Pros: Encourages completing work before committing
Cons: May be too strict; some TODOs are legitimate reminders for future work

#### Option: TODOs with issue links are acceptable

Allow TODO comments if they reference a tracked issue (e.g., `TODO(#123): ...`).

Pros: Balances pragmatism with tracking
Cons: Requires issue tracking discipline

#### Option: Context-dependent

Flag TODOs in production code but allow them in tests or scaffolding.

Pros: Pragmatic balance
Cons: Subjective boundaries

### How should the audit handle debug logging?

#### Option: Flag all console.log/print statements

Assume all debug logging is accidental and should be removed or converted to proper logging.

Pros: Clean codebase, encourages proper logging
Cons: May flag legitimate logging in scripts or tools

#### Option: Allow debug logging in specific contexts

Permit debug logging in development utilities, scripts, or files with "debug" in the name.

Pros: Pragmatic, allows intentional debug tooling
Cons: Requires heuristics to distinguish contexts

#### Option: Require structured logging

Flag console.log but allow structured logging through a proper logging framework.

Pros: Encourages best practices
Cons: May not apply to all codebases (e.g., simple scripts)

### Should the audit track trends over time?

#### Option: Report accumulation rate

Track whether broken windows are accumulating faster than being fixed, using git history.

Pros: Provides valuable trend data, highlights systemic issues
Cons: Complex to implement, requires git analysis

#### Option: Snapshot only

Report current state without historical analysis.

Pros: Simple, actionable
Cons: Misses important trend information

### How should the audit prioritize findings?

#### Option: Severity-based prioritization

Critical issues (disabled tests, swallowed errors) get high priority; aesthetic issues (formatting TODOs) get low priority.

Pros: Focuses attention on important issues
Cons: Requires maintaining severity classification

#### Option: Volume-based prioritization

Focus on the most common type of broken window first, regardless of severity.

Pros: Quick wins from fixing common patterns
Cons: May defer critical but rare issues

#### Option: Age-based prioritization

Oldest broken windows get priority, as they've festered longest.

Pros: Prevents long-term neglect
Cons: May prioritize harmless old TODOs over recent critical issues

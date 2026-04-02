# Naming Clarity Audit

Add a stock audit that identifies unclear names that violate the "clarity-over-brevity" and "naming-matters" principles.

## Context

The "clarity-over-brevity" principle states that names should be descriptive and self-documenting, even if longer. The "naming-matters" principle emphasizes that good naming reduces waste by eliminating confusion and making code self-documenting.

Currently, there is no stock audit to systematically identify unclear or cryptic names. Common violations include:
- Single-letter variable names (outside conventional contexts like loop indices)
- Unclear abbreviations (e.g., `usr`, `btn`, `idx` when not contextually obvious)
- Generic names that provide no information (e.g., `data`, `info`, `temp`, `handle`)
- Misleading names that don't match their purpose
- Inconsistent naming within the same context

## Proposed Audit

Create a `naming-clarity` stock audit in `lib/audits/stock-audits.ts` that:

1. **Searches for problematic patterns**:
   - Single-letter names outside acceptable contexts (i, j, k in loops; x, y in coordinates)
   - Common unhelpful abbreviations (btn, usr, idx, str, arr, obj, etc.)
   - Generic placeholder names (data, value, result, temp, handle, manager, helper)
   - Very short names in large scopes (e.g., single-letter function parameters)
   - Inconsistent naming patterns (e.g., mixing `get*`, `fetch*`, `retrieve*` for similar operations)

2. **Provides context-aware analysis**:
   - Scope matters: `i` in a 3-line loop is fine; `i` as a file-level variable is not
   - Domain conventions: Some abbreviations are standard in specific domains (e.g., `req`/`res` in HTTP handlers)
   - Framework patterns: Some frameworks have conventions that may conflict (e.g., React's `props`, `e` for events)

3. **Suggests improvements**:
   - Propose more descriptive alternatives based on usage context
   - Identify opportunities to use domain-specific terms
   - Flag names that could be more intention-revealing

## Related Principles

- **clarity-over-brevity** - Primary principle this audit enforces
- **naming-matters** - Emphasizes importance of good naming
- **consistent-naming** - Names should follow conventions
- **context-optimised-code** - Clear names reduce cognitive load

## Example Patterns to Detect

```javascript
// Cryptic abbreviations
const usr = getUser()  // Should be: user
const btn = document.querySelector()  // Should be: button

// Generic unhelpful names
function process(data) { ... }  // What kind of data? What processing?
const temp = calculate()  // Temporary what? Why temporary?

// Single-letter names in large scope
function handleRequest(r, c) {  // Should be: request, context
  // 50 lines of code using r and c
}

// Inconsistent naming
getUser()
fetchAccount()
retrieveProfile()  // Pick one pattern and stick with it
```

## Output Format

For each naming issue found, create ideas containing:
- Current name and location
- Why the name is unclear (too short, generic, inconsistent, etc.)
- Context of usage (scope size, function purpose)
- Suggested alternative names
- Related occurrences of the same pattern

## Open Questions

### How should the audit handle domain-specific abbreviations?

#### Option: Use a configurable allowlist

Allow projects to define acceptable abbreviations in `.dust/config/naming-conventions.json`.

Pros: Flexible, respects domain conventions
Cons: Requires configuration, may be underutilized

#### Option: Learn from codebase patterns

If an abbreviation is used consistently and has a clear full-name equivalent nearby, consider it acceptable.

Pros: Adapts to project conventions automatically
Cons: Complex to implement, may miss inconsistent usage

#### Option: Flag all abbreviations by default

Surface all potential abbreviations, letting reviewers decide what's acceptable.

Pros: Comprehensive, simple logic
Cons: May create noise in codebases with established conventions

### Should the audit distinguish between different identifier types?

#### Option: Different rules for different contexts

Apply stricter rules to function/class names than to local variables. Allow more abbreviated names in small scopes.

Pros: Context-appropriate, reduces false positives
Cons: More complex implementation

#### Option: Uniform rules across all identifiers

Apply the same naming standards regardless of identifier type.

Pros: Simpler, consistent
Cons: May be too strict for some contexts (e.g., loop indices)

### How should the audit handle framework conventions?

#### Option: Detect framework and apply exceptions

Recognize common frameworks (React, Express, etc.) and allow their conventional names (e.g., `props`, `req`, `res`).

Pros: Reduces noise, respects established patterns
Cons: Requires framework detection logic

#### Option: Flag all violations without framework awareness

Treat all names equally regardless of framework.

Pros: Simple, consistent
Cons: Will flag acceptable framework conventions

### Should the audit suggest specific renames?

#### Option: Suggest concrete alternatives

For each unclear name, propose specific better alternatives based on usage analysis.

Pros: Actionable, educational
Cons: May suggest wrong names without full context

#### Option: Identify pattern only

Flag unclear names without suggesting alternatives, letting developers choose appropriate names.

Pros: Avoids prescriptive suggestions that may be wrong
Cons: Less actionable, requires more thought to fix

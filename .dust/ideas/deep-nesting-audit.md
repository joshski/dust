# Deep Nesting Audit

Add a stock audit that identifies deeply nested control flow that obscures the happy path.

## Current State

There is no stock audit specifically targeting nesting depth and control-flow readability.

The examples originally cited in this idea no longer exist:
- `extractOpeningSentence(...)` in `lib/markdown/markdown-utilities.ts` has been refactored to use early returns and has max depth 3 (acceptable)
- `lib/cli/commands/bucket.ts` no longer exists (code has been split into `lib/bucket/` modules)

Running `oxlint -D max-depth` finds 4 violations in the codebase at depth 5, all in proxy code and lint validators.

## Lint Rules vs Audit

oxlint already provides [`max-depth`](https://oxc.rs/docs/guide/usage/linter/rules/eslint/max-depth) and [`max-nested-callbacks`](https://oxc.rs/docs/guide/usage/linter/rules/eslint/max-nested-callbacks) rules that catch mechanical nesting depth violations:

**Advantages of lint rules:**
- Instant feedback during `dust check`
- Configurable threshold (default 4, can be set via `.oxlintrc.json`)
- Zero agent context required - runs automatically
- Already available - no implementation needed

**What a lint rule cannot catch:**
- Semantic "happy path obscured" patterns where depth is acceptable but flow is hard to follow
- Cases where early-return refactoring would help even at depth 3
- Qualitative recommendations for flattening specific patterns

## Recommendation

Enable `max-depth` as a lint rule rather than creating a stock audit. The [Lint Everything](../principles/lint-everything.md) principle favours static analysis over periodic audits: "Every error caught by a linter is an error that never reaches tests."

A deep-nesting audit would only add value if it performed semantic analysis beyond pure depth counting. Since the original motivation was mechanical depth detection, the lint rule addresses the need more directly.

If semantic analysis of control flow readability is desired, it should be scoped separately as an audit focused on "happy path clarity" or "early-return opportunities" rather than nesting depth.

## Implementation Path

1. Add `max-depth` to `.oxlintrc.json`:
   ```json
   {
     "rules": {
       "max-depth": ["error", { "max": 4 }]
     }
   }
   ```
2. Fix the 4 existing violations in `lib/proxy/` and `lib/lint/validators/`
3. Optionally add `max-nested-callbacks` for callback-heavy code

## Open Questions

### Should max-depth be enabled by default?

#### Option: Enable with threshold 4

Use oxlint's default threshold of 4. This catches egregious nesting (depth 5+) while allowing reasonable patterns.

#### Option: Enable with threshold 3

Stricter threshold that encourages earlier refactoring. May require fixing more existing code.

#### Option: Enable with threshold 5

Lenient threshold that only catches severe cases. Lower false-positive rate but allows more complex nesting.

### Should violations block the build or warn?

#### Option: Error (blocking)

Violations fail `dust check`, enforcing the constraint immediately. Aligns with "stop the line" principle.

#### Option: Warning (non-blocking)

Violations produce warnings but don't fail the build. Allows gradual adoption without blocking work.

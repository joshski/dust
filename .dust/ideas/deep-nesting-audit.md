# Deep Nesting Audit

Add a stock audit that identifies deeply nested control flow that obscures the happy path.

## Current State

There is no stock audit specifically targeting nesting depth and control-flow readability.

Current examples:
- `lib/markdown/markdown-utilities.ts` `extractOpeningSentence(...)` (`29-98`) uses multiple loops and compound condition blocks to parse structure and extract content.
- `lib/cli/commands/bucket.ts` has effect interpreters and connection handling with nested switch/if structures (`718-830`, `952-1002`, `1092-1106`) that are correct but expensive to scan.

This mainly impacts comprehension speed and correctness when making targeted edits.

## Proposed Audit

Add a stock audit named `deep-nesting` in `lib/audits/stock-audits.ts`.

Template focus:
1. 3+ nested conditional/loop levels
2. Nested switch/if trees where guard clauses or extraction could flatten control flow
3. Blocks where "happy path" is hidden behind exceptional cases
4. Recommendations using extraction or early-return patterns

Required output per finding:
- Location
- Nesting pattern summary
- Comprehension impact
- Concrete flattening recommendation

## Relationship to Existing Audits

- Complements `refactoring-opportunities` by targeting a specific structural smell independent of commit history.
- Complements `error-handling` by improving readability of error branches without redefining error policy.

## Open Questions

### How should nesting severity be scored?

#### Option: Pure depth threshold

Severity rises at depth 3/4/5+ regardless of function size.

#### Option: Depth plus span

Require depth and a minimum block span (for example 20+ lines) to avoid over-flagging short guarded logic.

### Should switch nesting be treated differently from if nesting?

#### Option: Equal treatment

Any nested control tree that hides flow is scored the same.

#### Option: Switch-aware treatment

Allow deeper switch nesting before flagging, since effect dispatch naturally uses switch patterns.

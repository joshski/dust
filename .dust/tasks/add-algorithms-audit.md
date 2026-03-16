# Add Algorithms Audit

Add a stock audit named `algorithms` to evaluate algorithmic complexity and identify performance bottlenecks.

## Background

The dust codebase contains several algorithms with varying complexity characteristics. This audit helps document complexity expectations and identify suboptimal patterns.

## Template Focus

The audit template should guide agents to analyze:

1. Functions with nested loops or recursive calls
2. Use of `.includes()`, `.indexOf()`, or `.find()` inside loops (potential O(n²))
3. Missing Map/Set usage where O(1) lookup would help
4. Repeated string operations in loops (substring, split, join)
5. Missing early returns or break conditions
6. Graph/tree operations without cycle protection

## Required Output Per Finding

- Function name and location
- Current complexity analysis
- Data structures involved
- Suggested optimization (if applicable)
- Whether the complexity is acceptable given expected input sizes

## Implementation Notes

- Review existing audits in `lib/audits/stock-audits.ts` for the pattern
- Follow the `ideasHint` convention used by other audits
- Agents can use their judgement for complexity thresholds
- The audit should suggest specific optimizations, not just report findings

## Principles

- [Fast Feedback Loops](../principles/fast-feedback-loops.md) — Efficient algorithms contribute to fast feedback
- [Maintainable Codebase](../principles/maintainable-codebase.md) — Understanding complexity aids maintenance
- [Context-Optimised Code](../principles/context-optimised-code.md) — Simple, efficient code is easier to understand
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) — Keep pure analysis logic separate from output formatting

## Blocked By

(none)

## Definition of Done

- [ ] `algorithms` audit function added to `lib/audits/stock-audits.ts`
- [ ] Audit registered in `stockAuditFunctions` record
- [ ] Template covers the six focus areas listed above
- [ ] Output format includes all required fields per finding
- [ ] `bin/dust check` passes

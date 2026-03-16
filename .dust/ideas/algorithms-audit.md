# Algorithms Audit

Add a stock audit that evaluates algorithmic complexity and identifies potential performance bottlenecks.

## Background

The dust codebase contains several algorithms with varying complexity characteristics:

1. **Cycle detection in principle hierarchy** (`lib/lint/validators/principle-hierarchy.ts:129-168`) — O(n²) worst case, checking each principle's parent chain for cycles
2. **Bidirectional link validation** (`lib/lint/validators/principle-hierarchy.ts:89-127`) — O(n·m) with linear `.includes()` checks that could use Set lookups
3. **Workflow task matching** (`lib/artifacts/workflow-tasks.ts:181-217`) — O(t·w) scan for each idea lookup, could use Map indexing
4. **File system emulator directory listing** (`lib/filesystem/emulator.ts:162-179`) — O(n) full iteration over all files to list a single directory

These examples demonstrate opportunities to document complexity expectations and identify suboptimal patterns.

## Proposed Audit

Add a stock audit named `algorithms` in `lib/audits/stock-audits.ts`.

Template focus:
1. Functions with nested loops or recursive calls
2. Use of `.includes()`, `.indexOf()`, or `.find()` inside loops (potential O(n²))
3. Missing Map/Set usage where O(1) lookup would help
4. Repeated string operations in loops (substring, split, join)
5. Missing early returns or break conditions
6. Graph/tree operations without cycle protection

Required output per finding:
- Function name and location
- Current complexity analysis
- Data structures involved
- Suggested optimization (if applicable)
- Whether the complexity is acceptable given expected input sizes

## Relationship to Existing Audits

- Complements `single-responsibility-violations` by focusing on implementation efficiency rather than design
- Complements `global-state` by identifying stateful caches that could improve performance

## Principle Alignment

- [Fast Feedback Loops](../principles/fast-feedback-loops.md) — Efficient algorithms contribute to fast feedback
- [Maintainable Codebase](../principles/maintainable-codebase.md) — Understanding complexity aids maintenance
- [Context-Optimised Code](../principles/context-optimised-code.md) — Simple, efficient code is easier to understand

## Open Questions

### Should the audit focus on all code or just hot paths?

#### All code equally

Treat all functions the same regardless of call frequency. This ensures consistent standards and catches issues before code becomes hot.

#### Hot paths only

Focus on code that runs frequently (parsing, validation, file operations). Avoids noise from rarely-executed code like CLI initialization.

#### Configurable threshold

Allow the audit to accept a parameter specifying focus areas (e.g., `--hot-paths`, `--all`). More flexible but adds complexity.

### What complexity threshold should trigger findings?

#### Report O(n²) and above

Flag any nested iteration or quadratic behavior. Most common and impactful issues.

#### Report O(n log n) and above

Include sorting and divide-and-conquer patterns. More comprehensive but may produce noise for acceptable sorts.

#### Report all non-constant operations

Document every loop and recursive call. Useful for documentation but likely too verbose for actionable findings.

### Should the audit suggest specific optimizations or just report findings?

#### Suggest optimizations

Include concrete refactoring suggestions (e.g., "Replace `.includes()` with Set lookup"). More actionable but requires more sophisticated analysis.

#### Report only

Document the complexity and let developers decide on fixes. Simpler to implement and avoids potentially incorrect suggestions.

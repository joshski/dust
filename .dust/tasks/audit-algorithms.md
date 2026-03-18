# Audit: Algorithms

Evaluate algorithmic complexity and identify performance bottlenecks.

Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically, then create new idea files in `./.dust/ideas/` for any issues you identify, avoiding duplication.

## Scope

Focus on these areas:

1. **Nested loops or recursive calls** - Functions with O(n²) or worse complexity due to nested iteration
2. **Linear search inside loops** - Use of `.includes()`, `.indexOf()`, or `.find()` inside loops (potential O(n²))
3. **Missing Map/Set usage** - Repeated lookups in arrays where O(1) data structures would help
4. **Repeated string operations in loops** - Substring, split, join operations creating unnecessary allocations
5. **Missing early returns or break conditions** - Loops that continue processing after the result is found
6. **Graph/tree operations without cycle protection** - Recursive traversals that may infinite loop on cyclic structures

## Analysis Steps

1. Search for nested `for`/`while`/`forEach` loops and recursive functions
2. Look for `.includes()`, `.indexOf()`, `.find()` calls inside loop bodies
3. Identify arrays used for repeated membership testing that could be Sets
4. Find string operations (`substring`, `split`, `join`, `+` concatenation) inside loops
5. Check loops for opportunities to `break` or `return` early
6. Review recursive functions for visited/seen tracking in graph-like structures

## Output Per Finding

For each finding, provide:
- **Function name and location** - File path, line number, and function name
- **Current complexity analysis** - Big-O notation with explanation (e.g., "O(n²) due to nested iteration over items array")
- **Data structures involved** - What collections are being processed
- **Suggested optimization** - Specific fix (e.g., "Convert users array to Set for O(1) lookup", "Add visited Set to prevent cycles")
- **Acceptable complexity assessment** - Whether the current complexity is acceptable given expected input sizes (e.g., "Acceptable for small configs (<100 items), problematic for large datasets")

## Principles

- [Fast Feedback Loops](../principles/fast-feedback-loops.md) — Efficient algorithms contribute to fast feedback
- [Maintainable Codebase](../principles/maintainable-codebase.md) — Understanding complexity aids maintenance
- [Context-Optimised Code](../principles/context-optimised-code.md) — Simple, efficient code is easier to understand
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) — Keep pure analysis logic separate from output formatting

## Blocked By

(none)

## Definition of Done

- Searched for nested loops and recursive functions
- Identified linear search operations inside loops
- Found arrays that could benefit from Set/Map conversion
- Located repeated string operations in loops
- Reviewed loops for missing early exit conditions
- Checked recursive graph/tree operations for cycle protection
- Documented each finding with function name, location, complexity, data structures, optimization, and acceptability assessment
- Proposed ideas for any algorithmic improvements identified
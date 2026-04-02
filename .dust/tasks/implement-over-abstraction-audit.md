# Implement Over-Abstraction Audit

Add a stock audit that identifies violations of the "reasonably-dry" principle. The audit detects code that has been over-engineered with excessive abstraction.

## Principles

- [Reasonably DRY](../principles/reasonably-dry.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Context-Optimised Code](../principles/context-optimised-code.md)

## Guidance

### Reasonably DRY

Don't repeat yourself is a good principle, but don't overdo it.

Extracting shared code too eagerly can create tight coupling, obscure intent, and make changes harder. When two pieces of code look similar but serve different purposes or are likely to evolve independently, duplication is the better choice. The cost of a wrong abstraction is higher than the cost of a little repetition. Extract shared code when the duplication is truly about the same concept and has proven stable, not just because two things happen to look alike right now.

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

### Context-Optimised Code

Code should be structured so that agents can understand and modify it within their context window constraints.

Large files, deeply nested abstractions, and sprawling dependency chains all work against agents. A 3,000-line file cannot be fully loaded into context. A function that requires understanding six levels of indirection demands more context than one that is self-contained. Context-optimised code favours small files, shallow abstractions, explicit dependencies, and co-located related logic.

Dust should help projects identify files that are too large, modules that are too tangled, and patterns that make agent comprehension harder than it needs to be. This is not just about file size — it is about ensuring that the unit of code an agent needs to understand fits comfortably within the window available.

## Scope

Create an `over-abstraction` stock audit in `lib/audits/stock-audits.ts` that detects:

1. **Single-use abstractions**: Interfaces, base classes, or utility functions used in only one place
2. **Deep inheritance hierarchies**: Classes extending more than 2 levels deep
3. **Premature generalization**: Parameters always used with the same value, unused options/flags
4. **Excessive indirection**: Multiple layers of wrappers adding no value

The audit should:
- Use complexity vs benefit analysis to determine if an abstraction is valuable
- Flag all single-use abstractions as potential over-abstraction
- Apply the same standards to test code as production code
- Provide inline suggestions for simple cases (e.g., inlining single-use wrappers)
- Respect framework conventions (don't flag framework-mandated patterns)
- Use context-dependent depth thresholds for inheritance

For each over-abstraction found, create ideas containing:
- Type of over-abstraction (single-use, deep hierarchy, premature generalization, etc.)
- Location and description
- Why it's problematic (complexity without benefit)
- Usage analysis (how often used, how varied)
- Suggested simplification approach
- Estimated impact of simplification

## Task Type

implement

## Blocked By

(none)

## Definition of Done

- New `overAbstraction()` function added to `lib/audits/stock-audits.ts`
- Function added to `STOCK_AUDITS` export array
- Audit detects single-use abstractions (interfaces, classes, functions)
- Audit detects deep inheritance hierarchies (>2 levels)
- Audit detects premature generalization (unused parameters, always-same values)
- Audit detects excessive indirection (wrapper chains)
- Audit respects framework conventions
- Audit creates ideas in `.dust/ideas/` for each issue found
- Audit includes usage analysis and simplification suggestions
- Unit tests added for the new audit
- All existing tests pass

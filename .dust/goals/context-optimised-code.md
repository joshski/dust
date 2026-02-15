# Context-Optimised Code

Code should be structured so that agents can understand and modify it within their context window constraints.

Large files, deeply nested abstractions, and sprawling dependency chains all work against agents. A 3,000-line file cannot be fully loaded into context. A function that requires understanding six levels of indirection demands more context than one that is self-contained. Context-optimised code favours small files, shallow abstractions, explicit dependencies, and co-located related logic.

Dust should help projects identify files that are too large, modules that are too tangled, and patterns that make agent comprehension harder than it needs to be. This is not just about file size — it is about ensuring that the unit of code an agent needs to understand fits comfortably within the window available.

## Parent Goal

- [Ideal Agent Developer Experience](ideal-agent-developer-experience.md)

## Sub-Goals

- (none)

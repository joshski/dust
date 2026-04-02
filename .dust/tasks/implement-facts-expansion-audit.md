# Implement Facts Expansion Audit

Add a stock audit that reviews the codebase for significant facts that should be documented in `.dust/facts/`.

## Context

Facts capture how things work today, providing context for agents and contributors. However, not all significant aspects of the codebase are currently documented as facts. This creates gaps where agents working in specific areas may lack important context that isn't obvious from scanning code or having prior framework knowledge.

The audit should identify missing facts by analyzing the codebase for patterns, conventions, and design decisions that would benefit future agents but aren't currently documented.

## Task Type

implement

## Principles

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

### Small Units

Ideas, principles, facts, and tasks should each be as discrete and fine-grained as possible.

Small, focused documents enable precise relationships between them. A task can link to exactly the principles it serves. A fact can describe one specific aspect of the system. This granularity reduces ambiguity.

Tasks especially benefit from being small. A narrowly scoped task gives agents or humans the best chance of delivering exactly what was intended, in a single atomic commit.

### Agent Autonomy

Dust exists to enable AI agents to produce work autonomously.

With sufficient planning and small enough units, this works much better in practice.

### Batteries Included

Dust should provide everything that is required (within reason) for an agent to be productive in an arbitrary codebase.

An agent working autonomously should not be blocked because a tool or configuration is missing. For example, dust should ship custom lint rules for different linters, even though those linters are not dependencies of dust itself. If an agent needs a capability to do its job well in a typical codebase, dust should provide it out of the box.

This means accepting some breadth of scope — bundling configs, rules, and utilities that target external tools — in exchange for agents that can start producing useful work immediately without manual setup.

### Exploratory Tooling

Agents need tools to efficiently explore and understand unfamiliar codebases.

When an agent encounters a new codebase — or an unfamiliar corner of a familiar one — it needs to quickly build a mental model: what exists, how it fits together, and where to make changes. Without good exploratory tools, agents waste context on trial-and-error searches, reading irrelevant files, and forming incorrect assumptions.

Dust should promote and integrate tools that help agents explore: dependency graphs, module overviews, search utilities tuned for code navigation, and summaries of project structure. The goal is to make the "orientation" phase of any task as short and reliable as possible.

## Implementation Guidance

Add a stock audit named `facts-expansion` in `lib/audits/stock-audits.ts`. Follow the same pattern as existing audits like `factsVerification()`.

The audit should:

1. Review the codebase for significant facts that aren't obvious from code inspection
2. Compare findings against existing facts in `.dust/facts/`
3. Identify gaps where documented facts would benefit future agents
4. Create ideas for documenting each missing fact

### Areas to Cover

The audit should analyze these areas:

**Architectural Decisions**
- Separation of concerns patterns not enforced by directory structure
- Dependency flow rules (e.g., what can depend on what)
- Layer boundaries and their purposes
- Module initialization order requirements
- Plugin or extension mechanisms

**Implementation Conventions**
- Naming patterns for specific types of code (factories, builders, validators)
- Error handling conventions (when to throw vs return errors)
- Async/await patterns and Promise handling
- Resource cleanup patterns
- State management approaches

**External Integration Points**
- CLI command structure and parsing approach
- Event emission patterns
- File system conventions
- Process spawning patterns
- Network communication protocols

**Performance Characteristics**
- Known performance bottlenecks
- Caching strategies
- Lazy loading patterns
- Resource pooling approaches
- Optimization trade-offs

**Historical Context**
- Migration paths from previous approaches
- Deprecated patterns still present in legacy code
- Trade-offs made in past decisions
- Features that were removed and why

### Analysis Approach

The audit should:

1. **Scan for patterns** - Look for repeated implementation patterns across multiple files
2. **Identify conventions** - Find coding conventions that aren't enforced by linters
3. **Review configuration** - Document configuration systems and their purposes
4. **Trace data flows** - Identify how data moves through the system
5. **Check existing facts** - Compare findings against what's already documented
6. **Filter for significance** - Only suggest facts that would genuinely help future agents (facts that aren't obvious from code inspection)

### Output Format

For each suggested fact, create an idea file that includes:

- **Fact title** - A clear, concise title for the proposed fact
- **Why this matters** - Explanation of why this fact would be valuable to document
- **What to document** - Specific aspects to cover in the fact file
- **Where to look** - File paths or code locations that demonstrate this fact
- **Example content** - A sketch of what the fact file might contain

### Design Decisions

Based on the resolved questions from the idea:

- **Significance criteria**: Facts that aren't obvious from code inspection
- **Framework knowledge**: Document all framework patterns used in the project
- **Fact grouping**: One fact per concept (following the Small Units principle)
- **Volatile facts**: Document with update frequency note

## Blocked By

(none)

## Definition of Done

- Added `factsExpansion()` function to `lib/audits/stock-audits.ts`
- Added `'facts-expansion': factsExpansion` to `stockAuditFunctions` record
- Audit template includes opening sentence for description extraction
- Audit covers all areas specified (architectural, conventions, integrations, performance, historical)
- Audit output creates idea files (not fact files directly)
- Each idea file includes: fact title, why it matters, what to document, where to look, example content
- Tests pass (`bin/dust check`)
- Audit appears in `bin/dust audit` list

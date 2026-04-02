# Facts Expansion Audit

Add a stock audit that reviews the codebase for significant facts that should be documented in `.dust/facts/`.

## Context

Facts capture how things work today, providing context for agents and contributors. However, not all significant aspects of the codebase are currently documented as facts. This creates gaps where agents working in specific areas may lack important context that isn't obvious from scanning code or having prior framework knowledge.

The `.dust/facts/` directory currently contains 33 fact files covering areas like:
- Build and deployment processes (npm publishing, Docker agent mode)
- Architecture decisions (principle hierarchy design, functional core imperative shell)
- Tool integrations (Vitest testing, Bun runtime, bucket protocol)
- Configuration systems (command events transport, dust event protocol)

However, there may be additional significant facts about:
- Non-obvious implementation patterns or conventions
- Historical context for architectural decisions
- Integration points with external systems
- Performance characteristics or constraints
- Error handling strategies
- Data flow patterns
- Security boundaries

## Proposed Audit

Add a stock audit named `facts-expansion` in `lib/audits/stock-audits.ts`.

The audit should:
1. Review the codebase for significant facts that aren't obvious from code inspection
2. Compare findings against existing facts in `.dust/facts/`
3. Identify gaps where documented facts would benefit future agents
4. Create ideas for documenting each missing fact

## Scope

The audit should focus on these areas:

### 1. Architectural Decisions

Look for non-obvious architectural patterns:
- Separation of concerns patterns not enforced by directory structure
- Dependency flow rules (e.g., what can depend on what)
- Layer boundaries and their purposes
- Module initialization order requirements
- Plugin or extension mechanisms

### 2. Implementation Conventions

Identify established conventions:
- Naming patterns for specific types of code (factories, builders, validators)
- Error handling conventions (when to throw vs return errors)
- Async/await patterns and Promise handling
- Resource cleanup patterns
- State management approaches

### 3. External Integration Points

Document how the system interacts externally:
- CLI command structure and parsing approach
- Event emission patterns
- File system conventions
- Process spawning patterns
- Network communication protocols

### 4. Performance Characteristics

Capture performance-related facts:
- Known performance bottlenecks
- Caching strategies
- Lazy loading patterns
- Resource pooling approaches
- Optimization trade-offs

### 5. Historical Context

Document why things are the way they are:
- Migration paths from previous approaches
- Deprecated patterns still present in legacy code
- Trade-offs made in past decisions
- Features that were removed and why

## Analysis Approach

The audit should:

1. **Scan for patterns** - Look for repeated implementation patterns across multiple files
2. **Identify conventions** - Find coding conventions that aren't enforced by linters
3. **Review configuration** - Document configuration systems and their purposes
4. **Trace data flows** - Identify how data moves through the system
5. **Check existing facts** - Compare findings against what's already documented
6. **Filter for significance** - Only suggest facts that would genuinely help future agents

## Output Format

For each suggested fact, create an idea that includes:

- **Fact title** - A clear, concise title for the proposed fact
- **Why this matters** - Explanation of why this fact would be valuable to document
- **What to document** - Specific aspects to cover in the fact file
- **Where to look** - File paths or code locations that demonstrate this fact
- **Example content** - A sketch of what the fact file might contain

## Relationship to Existing Audits

This audit complements:
- **Documentation Drift** - That audit checks if existing docs are stale; this finds missing docs
- **Agent Developer Experience** - Facts are part of the agent developer experience
- **Repository Context** - Repository context is high-level; facts are specific implementation details

## Open Questions

### What qualifies as a "significant" fact?

#### Option: Facts that aren't obvious from code inspection

A fact is significant if an agent couldn't deduce it by reading the relevant code files. This includes patterns that emerge across multiple files, historical context, or conventions that aren't enforced structurally.

Benefits: Focuses on genuinely useful documentation; avoids documenting things that are self-evident.

Drawbacks: Subjective judgment call; agents may disagree on what's obvious.

#### Option: Facts that would prevent common mistakes

A fact is significant if not knowing it would likely lead agents to make incorrect implementations or violate established patterns.

Benefits: Directly prevents errors; high practical value.

Drawbacks: May miss useful context that doesn't directly prevent errors.

#### Option: Facts referenced in multiple workflow contexts

A fact is significant if it would be relevant to agents working in multiple different areas of the codebase.

Benefits: Ensures facts have broad utility; avoids overly specific documentation.

Drawbacks: May miss important area-specific facts that agents frequently need.

### How should the audit handle framework-specific knowledge?

#### Option: Document all framework patterns used

Document how the project uses its frameworks and libraries, even if this information is in framework documentation elsewhere.

Benefits: Agents don't need to search external docs; context is complete.

Drawbacks: Creates maintenance burden; duplicates external documentation.

#### Option: Document only project-specific patterns

Only document how this specific project uses frameworks, not general framework knowledge.

Benefits: Avoids duplication; focuses on project-specific context.

Drawbacks: Agents may still lack necessary framework knowledge.

#### Option: Document deviations from framework conventions

Only document cases where the project doesn't follow standard framework patterns.

Benefits: Minimal documentation; highlights surprising aspects.

Drawbacks: Assumes agents know framework conventions; may miss context.

### Should the audit suggest grouping related facts?

#### Option: One fact per concept

Each distinct concept gets its own fact file, even if concepts are related.

Benefits: Easy to link to specific facts; follows small-units principle.

Drawbacks: May create many small files; related information is scattered.

#### Option: Group related facts

Related concepts are documented together in broader fact files.

Benefits: Provides complete context; fewer files to maintain.

Drawbacks: Fact files become larger; harder to link to specific aspects.

#### Option: Hybrid approach

Use judgment to group very tightly related facts while keeping distinct concepts separate.

Benefits: Balances completeness with specificity.

Drawbacks: Requires subjective judgment; less consistent structure.

### How should the audit handle facts that change frequently?

#### Option: Document with update frequency note

Document the fact but note that it may change frequently and when it was last updated.

Benefits: Provides useful context despite volatility.

Drawbacks: May become stale quickly; creates maintenance burden.

#### Option: Only document stable facts

Skip facts about aspects that change frequently in favor of more stable patterns.

Benefits: Facts stay relevant longer; less maintenance.

Drawbacks: May miss important but evolving aspects of the system.

#### Option: Document as principles instead

Convert frequently-changing facts into principles that guide the current implementation.

Benefits: Principles are more stable; provides guiding intent.

Drawbacks: Loses specific implementation details; less actionable.

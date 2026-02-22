# New Stock Audits

Propose additional stock audits to improve codebase health monitoring.

## Context

The dust audit system (`lib/audits/stock-audits.ts`) currently provides 14 stock audits covering: agent developer experience, component reuse, coverage exclusions, data access review, dead code, facts verification, ideas from commits, ideas from principles, performance review, refactoring opportunities, security review, stale ideas, test coverage, and ubiquitous language.

Reviewing dust's core goals—human-AI collaboration, agent autonomy, maintainable codebase, and lightweight planning—several areas are not currently covered by audits.

## Proposed Audits

### Error Handling Consistency

Review error handling patterns across the codebase for consistency and completeness.

Focus areas:
1. **Inconsistent error types** - Are errors thrown as strings, Error objects, or custom types?
2. **Missing error handling** - Are there async operations without try/catch or .catch()?
3. **Error swallowing** - Are errors being caught but not logged or re-thrown?
4. **Error message quality** - Do error messages help diagnose the problem?
5. **Error boundaries** - Are errors contained appropriately at module boundaries?

Relates to principles: [Actionable Errors](../principles/actionable-errors.md)

### Dependency Health

Review project dependencies for security, maintenance status, and upgrade opportunities.

Focus areas:
1. **Outdated major versions** - Dependencies multiple major versions behind
2. **Deprecated packages** - Dependencies no longer maintained
3. **Duplicate dependencies** - Same functionality from multiple packages
4. **Unnecessary dependencies** - Packages used for trivial operations that could be inline
5. **License compatibility** - Dependencies with problematic licenses

Relates to principles: [Minimal Dependencies](../principles/minimal-dependencies.md)

### Documentation Freshness

Review documentation for accuracy against current implementation.

Focus areas:
1. **README accuracy** - Do setup instructions still work?
2. **API documentation** - Do documented interfaces match implementation?
3. **Code comments** - Do comments describe what the code actually does?
4. **Example code** - Do examples compile and run correctly?
5. **Configuration documentation** - Are all config options documented?

Relates to principles: [Agent Context Inference](../principles/agent-context-inference.md), [Ideal Agent Developer Experience](../principles/ideal-agent-developer-experience.md)

### Commit History Quality

Analyze recent commits for adherence to project standards.

Focus areas:
1. **Commit message format** - Do commits follow the expected format?
2. **Atomic commits** - Is each commit self-contained and complete?
3. **Task-commit alignment** - Do commits reference the tasks they complete?
4. **Artifact hygiene** - Are task files deleted when work is done?
5. **Co-author attribution** - Are AI contributions properly attributed?

Relates to principles: [Atomic Commits](../principles/atomic-commits.md), [Traceable Decisions](../principles/traceable-decisions.md)

### Task Queue Health

Review the current state of tasks and ideas for workflow health.

Focus areas:
1. **Blocked tasks** - Are there tasks waiting on unresolved blockers?
2. **Task dependencies** - Are blocked-by references valid and resolvable?
3. **Task scope creep** - Are tasks too large or vague to complete atomically?
4. **Orphaned ideas** - Are there ideas with no path to becoming tasks?
5. **Workflow stalls** - Is work progressing or stuck in planning?

Relates to principles: [Lightweight Planning](../principles/lightweight-planning.md), [Small Units](../principles/small-units.md)

### Type Safety

Review TypeScript usage for type safety gaps.

Focus areas:
1. **`any` usage** - Where is the `any` type used and can it be avoided?
2. **Type assertions** - Are `as` casts hiding type mismatches?
3. **Implicit any** - Are function parameters missing type annotations?
4. **Nullable types** - Are null/undefined handled explicitly?
5. **Generic constraints** - Are generics properly constrained?

Relates to principles: [Make Changes with Confidence](../principles/make-changes-with-confidence.md), [Lint Everything](../principles/lint-everything.md)

### API Surface Review

Review public API surface for consistency and usability.

Focus areas:
1. **Function signatures** - Are parameter orders and types consistent?
2. **Return types** - Are return values predictable and documented?
3. **Naming conventions** - Do public APIs follow consistent naming?
4. **Breaking changes** - Have recent changes altered public contracts?
5. **Export hygiene** - Are only intended APIs exported?

Relates to principles: [Consistent Naming](../principles/consistent-naming.md), [Decoupled Code](../principles/decoupled-code.md)

## Open Questions

### Which audits should be prioritized?

#### Option: Agent-focused audits first

Prioritize audits that directly help agents work more effectively: documentation freshness, error handling consistency, type safety. These improve agent context and reduce debugging cycles.

#### Option: Codebase health audits first

Prioritize audits that improve overall codebase quality: dependency health, commit history quality, task queue health. These benefit both humans and agents.

#### Option: Add all as a single batch

Add all proposed audits at once since they cover different areas and don't overlap with existing audits.

### Should any existing audits be merged or refactored?

#### Option: Keep separate

Existing audits are distinct enough to remain separate. New audits simply extend the available set.

#### Option: Create audit categories

Group related audits (e.g., "code quality", "workflow health", "agent experience") to help users choose. This would be a structural change beyond just adding new audits.

### How granular should audits be?

#### Option: Focused single-purpose audits

Each audit covers one specific area. This matches the current pattern and keeps audits fast and actionable.

#### Option: Broader multi-area audits

Combine related concerns into larger audits to reduce the total number. Trade-off: slower to run, harder to skip irrelevant parts.

# Complex ideas

Allow ideas to be marked as "complex" when they require multiple phases of exploration, rather than tracking dependencies between separate idea files.

## Motivation

The [Some Big Design Up Front](../principles/some-big-design-up-front.md) principle observes that AI agents lower the cost of architectural exploration. Users want to plan ambitious work before implementation begins. The question is how to express that scope.

This proposal uses internal structure: "Idea A has phases 1, 2, 3." Each phase represents a distinct exploration area that must be refined before moving on.

## How It Would Work

A complex idea contains multiple `## Phase` sections. Workflow tasks operate on individual phases rather than the whole idea:

```markdown
# Multi-tenant Architecture

Redesigning the system to support multiple tenants.

## Phase 1: Data Isolation

Explore options for isolating tenant data at the database level.

## Phase 2: Authentication

Design the authentication and authorization model for tenants.

## Phase 3: Configuration

Determine how tenant-specific configuration will be managed.
```

Phases are strictly sequential—Phase 2 cannot begin until Phase 1 is complete. This matches document order and keeps the model simple.

### Phase Completion

Phase completion is tracked by adding "(Completed)" to the phase heading:

```markdown
## Phase 1: Data Isolation (Completed)
```

This is visible, simple, and requires no new syntax. When all phases are marked complete, the idea is ready for decomposition.

### Workflow Task Targeting

A `Refine Idea` task would target a specific phase:

```
Refine Idea: Multi-tenant Architecture (Phase 1: Data Isolation)
```

Each phase would have its own open questions and resolution cycle. When a phase's open questions are resolved, the task marks it "(Completed)" and creates a task for the next phase (if any).

## Alignment with Principles

| Principle | Alignment |
|-----------|-----------|
| [Small Units](../principles/small-units.md) | Tension — files grow larger, but phases keep exploration focused |
| [Some Big Design Up Front](../principles/some-big-design-up-front.md) | Strong — enables thorough multi-part exploration before implementation |
| [Lightweight Planning](../principles/lightweight-planning.md) | Moderate — no new file types, but adds phase parsing |

The Small Units tension is acceptable because:
1. Phases keep each exploration area discrete even within a larger file
2. The alternative (idea dependencies) adds more conceptual overhead
3. A cohesive narrative in one file aids understanding

## Implementation Considerations

Based on codebase analysis:

1. **Idea parsing** — `lib/artifacts/ideas.ts` defines `parseIdea()`. Would need to extract `## Phase` sections and their completion status. Phases could use the existing `IdeaOpenQuestion` structure for their open questions.

2. **Workflow task creation** — `createRefineIdeaTask()` would need to accept an optional phase identifier. The task title format `Refine Idea: <Idea Title> (Phase N: <Phase Title>)` fits existing patterns.

3. **Task matching** — `findWorkflowTaskForIdea()` would need to handle phase-scoped tasks. The `WorkflowTaskMatch` type would gain an optional `phase` field.

4. **Completion tracking** — Parse "(Completed)" suffix in phase headings. Simple string matching, no new markdown syntax.

5. **Validation** — `idea-validator.ts` would validate that referenced phases exist and aren't already complete.

## Open Questions

### How should open questions work with phases?

#### Each phase has its own `## Open Questions` section

Phases contain their own open questions block. When refining Phase 1, only Phase 1's open questions appear. This keeps each phase self-contained.

```markdown
## Phase 1: Data Isolation

Description here.

### Open Questions

#### Should we use row-level security?

Option A, Option B...
```

#### Single `## Open Questions` section for the whole idea

All open questions live at the end of the file. Questions are tagged or grouped by phase. Simpler structure but less encapsulated.

### What happens when the last phase is completed?

#### Auto-transition to ready for decomposition

When all phases are marked "(Completed)", the idea automatically becomes eligible for a `Decompose Idea` task. No manual step needed.

#### Manual final review

Completing the last phase triggers a `Finalize Idea` task that reviews the whole idea before decomposition. Adds a checkpoint but also complexity.

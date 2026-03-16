# Complex ideas

Allow ideas to be marked as "complex" when they require multiple phases of exploration, rather than tracking dependencies between separate idea files.

This is an alternative approach to [Idea dependencies](idea-dependencies.md) that addresses the same motivation—enabling ambitious, multi-part planning—without introducing inter-idea ordering relationships.

## Motivation

The [Some Big Design Up Front](../principles/some-big-design-up-front.md) principle observes that AI agents lower the cost of architectural exploration. Users want to plan ambitious work before implementation begins. The question is how to express that scope.

Idea dependencies propose external relationships between ideas: "Idea A requires Idea B." Complex ideas propose internal structure: "Idea A has phases 1, 2, 3."

## How It Could Work

A complex idea would contain multiple `## Phase` sections, each representing a distinct exploration area. Workflow tasks would operate on individual phases rather than the whole idea:

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

A `refine-idea` task could target a specific phase: "Refine Idea: Multi-tenant Architecture (Phase 1: Data Isolation)". Each phase would have its own open questions and resolution cycle.

## Comparison with Idea Dependencies

| Aspect | Idea Dependencies | Complex Ideas |
|--------|------------------|---------------|
| Number of files | Multiple ideas | Single idea |
| Ordering mechanism | External links between files | Internal section order |
| Granularity | Idea-level | Phase-level |
| Flexibility | Can reorder by changing links | Phases are sequential by default |
| Completion tracking | Delete or transition linked idea | Mark phase as resolved within file |
| Small Units principle | Aligned (separate files) | Tension (larger files) |
| Discovery | See relationships across files | See full scope in one file |

## Advantages Over Idea Dependencies

1. **No orphan risk** — Dependencies between ideas can break if one idea is shelved or renamed. Phases within a single file cannot become orphaned.

2. **Cohesive narrative** — A complex idea tells its complete story in one place. Dependencies require readers to navigate multiple files to understand the full picture.

3. **Simpler workflow** — No new completion signals needed. Phases can use existing open questions format to track resolution.

4. **Natural sequencing** — Document order implies phase order without needing explicit "requires" links.

## Disadvantages

1. **Larger files** — Violates [Small Units](../principles/small-units.md) more directly. A complex idea could grow quite large.

2. **Less flexibility** — Phases are implicitly sequential. Dependencies allow arbitrary ordering.

3. **Harder to parallelize** — Two agents couldn't easily work on different phases of the same idea, whereas they could work on separate dependent ideas.

4. **Mixing concerns** — Different phases might have different priority levels or timelines, but they're bundled together.

## Open Questions

### Should phases support parallel execution?

#### Phases are strictly sequential

Phase 2 cannot begin until Phase 1 is complete. This matches the document order and keeps the model simple. The constraint ensures thorough exploration of each phase before moving on.

#### Phases can declare their own dependencies

Allow `### Requires` within a phase section to reference other phases by name. This enables parallel exploration where phases are independent, while still supporting sequential exploration where needed.

### How would phase completion be tracked?

#### Checkboxes within phase headers

Use markdown checkboxes: `## Phase 1: Data Isolation [x]`. Simple and visible, but adds non-standard syntax.

#### A dedicated "Completed Phases" section

List completed phases in a separate section at the bottom. Keeps phase content clean but requires scrolling to see status.

#### Phase-specific workflow tasks

Generate `Refine Idea Phase: Multi-tenant Architecture / Data Isolation` tasks. Completion is tracked by task deletion. Adds workflow task complexity.

### Could both approaches coexist?

#### Yes, use both as appropriate

Simple multi-part work uses phases within a single idea. Work that spans truly independent domains uses separate ideas with dependencies. This is flexible but adds conceptual overhead.

#### No, choose one approach

Having two ways to express multi-part work is confusing. Pick the one that best fits the principles and use it consistently.

## Related Ideas

- [Idea dependencies](idea-dependencies.md) — The alternative approach this idea competes with

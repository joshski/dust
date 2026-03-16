# Idea dependencies

Ideas are intentionally isolated—they cannot block or depend on other ideas. This keeps ideas small and prevents them from growing into unwieldy multi-part epics. But there may be value in expressing ordering relationships between ideas, distinct from the hard blocking that tasks support.

## Motivation: Big Design Up Front

The [Some Big Design Up Front](../principles/some-big-design-up-front.md) principle observes that AI agents lower the cost of architectural exploration, making heavier upfront investment rational during the idea phase. Users want to plan ambitious work—like a whole prototype of a system—before any implementation begins.

Currently, the only way to sequence work is by creating tasks with artificial "Blocked By" relationships. This forces premature decomposition: you must create tasks just to express ordering, even when ambiguity remains. By allowing ideas to depend on other ideas, users could:

1. Plan an ambitious scope as a set of related ideas
2. Refine each idea thoroughly, resolving ambiguity
3. Decompose ideas into tasks only when ready
4. Have agents execute tasks autonomously, since most design decisions are already made

This workflow aligns with the principle's guidance that exploration should continue until "the chosen direction has clear justification" and "remaining uncertainty is about requirements, not design."

## Current State

Tasks have a `## Blocked By` section that links to other tasks. A task with unresolved blockers is hidden from the next-task picker until all blockers are completed (deleted). This mechanism:

- Enforces ordering when one task's output is another's input
- Prevents agents from picking up work they can't complete
- Uses file deletion as the completion signal

Ideas have no equivalent mechanism. They can reference each other via markdown links in prose (e.g., "See also [Idea priority](idea-priority.md)") or in a `## Related Ideas` section, but these references are purely informational—they don't affect workflow commands like `dust ideas` or idea selection.

## Tension with Small Units

The [Small Units](../principles/small-units.md) principle encourages fine-grained artifacts. The [Lightweight Planning](../principles/lightweight-planning.md) principle notes that "ideas are intentionally vague until implementation is imminent."

Idea dependencies create tension with these principles:

1. **Scope creep risk** — An idea that "depends on" another might grow into an unwieldy multi-part epic, violating small units.

2. **Premature ordering** — Ideas represent potential directions, not committed work. Imposing order on uncommitted work creates false precision.

3. **Workflow complexity** — If ideas blocked each other the way tasks do, the idea picker would need blocking logic, and ideas could become stuck if their "blockers" are never refined.

However, the "Some Big Design Up Front" principle suggests that individual artifacts can remain small while relationships between them express larger scope. A dependency between ideas doesn't make either idea larger—it just captures their natural ordering.

## Alternative Relationship Types

Rather than blocking, ideas might benefit from other relationship types:

### Supersedes / Obsoletes

An idea may make another idea irrelevant. For example, "Rewrite auth system" might supersede "Fix auth bug." Currently, the author must remember to shelve the obsolete idea.

### Extends / Builds On

An idea may extend another without blocking it. For example, "Dark mode" might build on "Theme system." Either could be implemented independently, but together they form a coherent direction.

### Conflicts With

Two ideas may be mutually exclusive—implementing one precludes the other. Making this explicit would help prioritization discussions.

## Terminology

For tasks, "Blocked By" is accurate—the task literally cannot proceed until blockers are deleted. For ideas, the semantics differ because ideas are refined (not deleted) when complete.

Candidate terms for idea ordering:

- **Requires** — Clear ordering semantics: "Idea A requires Idea B" means B should be refined first
- **After** — Explicit ordering without implying hard blocking
- **Depends on** — Similar to requires, but less directional
- **Blocked by** — Consistent with tasks, but ideas are refined rather than deleted

"Requires" or "After" seem clearest for the use case: expressing that one idea should be explored before another, without implying the hard blocking semantics that tasks have.

## Open Questions

### How should idea dependencies affect workflow?

#### Soft ordering (advisory)

Ideas with unmet requirements are still shown in `dust ideas`, but dependencies are displayed. Users see the suggested order but can choose to work on any idea. This preserves flexibility while capturing useful context.

Pros: No stuck ideas, respects that exploration is non-linear
Cons: Doesn't enforce the ordering that enables autonomous agent execution

#### Hard ordering (enforced)

Ideas with unmet requirements are hidden from the default `dust ideas` output, similar to how blocked tasks are hidden from `dust next`. Only ideas whose requirements are all shelved or decomposed are shown as "ready."

Pros: Enables the autonomous workflow where agents can trust the queue
Cons: Ideas could become stuck; adds complexity to idea selection

#### Hybrid: soft by default, hard opt-in

The default `dust ideas` shows all ideas with dependency annotations. A flag like `--ready` filters to only ideas with satisfied requirements.

Pros: Flexibility with the option for strictness
Cons: Two modes to understand; may not encourage the disciplined workflow

### What completion signal indicates a requirement is satisfied?

#### Shelving satisfies requirements

A requirement is satisfied when the required idea is shelved. This treats shelving as "this idea is resolved, no longer needed."

Pros: Simple, single completion state
Cons: Shelving currently means "discarded," not "complete"

#### Decomposition satisfies requirements

A requirement is satisfied when the required idea is decomposed into tasks. This treats decomposition as "this idea is now actionable work."

Pros: Aligns with the intended workflow—refine ideas until ready to decompose
Cons: Decomposed ideas remain as files, requiring additional tracking

#### Either transition satisfies requirements

Both shelving and decomposition satisfy requirements. This is more permissive but may be confusing.

#### Explicit "done" state for ideas

Add a new transition like "Complete Idea" that signals resolution without shelving or decomposing. This would be used when an idea's exploration is finished but no tasks are needed.

Pros: Clear semantics for "requirement satisfied"
Cons: Adds a new concept to the workflow

### Should dependencies be transitive?

#### Yes, transitive dependencies

If any requirement in the chain is unsatisfied, the dependent idea is blocked. This ensures proper ordering in complex plans.

Pros: Correct ordering for multi-level plans
Cons: Harder to reason about; one unsatisfied idea can block many

#### No, direct dependencies only

Each idea only tracks its direct requirements. Users must explicitly add all requirements.

Pros: Simpler mental model, explicit dependencies
Cons: Users must manually ensure correct ordering

## Related Ideas

- [Task priority](task-priority.md) — Adds ordering metadata to tasks
- [Idea priority](idea-priority.md) — Adds ordering metadata to ideas

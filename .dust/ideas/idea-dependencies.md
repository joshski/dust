# Idea dependencies

Ideas are intentionally isolated—they cannot block or depend on other ideas. This keeps ideas small and prevents them from growing into unwieldy multi-part epics. But there may be value in expressing softer relationships between ideas, distinct from the hard blocking that tasks support.

## Current State

Tasks have a `## Blocked By` section that links to other tasks. A task with unresolved blockers is hidden from the next-task picker until all blockers are completed (deleted). This mechanism:

- Enforces ordering when one task's output is another's input
- Prevents agents from picking up work they can't complete
- Uses file deletion as the completion signal

Ideas have no equivalent mechanism. They can reference each other via markdown links in prose (e.g., "See also [Idea priority](idea-priority.md)") or in a `## Related Ideas` section, but these references are purely informational—they don't affect workflow commands like `dust ideas` or idea selection.

## Why Ideas Avoid Hard Blocking

The [Small Units](../principles/small-units.md) principle encourages fine-grained artifacts. The [Lightweight Planning](../principles/lightweight-planning.md) principle notes that "ideas are intentionally vague until implementation is imminent."

If ideas could block each other the way tasks can, several problems arise:

1. **Scope creep** — An idea that "depends on" another is likely too large. The dependency suggests it should be a single, larger idea or decomposed into tasks.

2. **Premature ordering** — Ideas represent potential directions, not committed work. Imposing order on uncommitted work creates false precision.

3. **Workflow complexity** — The idea picker would need blocking logic, and ideas could become stuck if their "blockers" are never refined.

## Alternative Relationship Types

Rather than blocking, ideas might benefit from other relationship types:

### Supersedes / Obsoletes

An idea may make another idea irrelevant. For example, "Rewrite auth system" might supersede "Fix auth bug." Currently, the author must remember to shelve the obsolete idea.

### Extends / Builds On

An idea may extend another without blocking it. For example, "Dark mode" might build on "Theme system." Either could be implemented independently, but together they form a coherent direction.

### Conflicts With

Two ideas may be mutually exclusive—implementing one precludes the other. Making this explicit would help prioritization discussions.

## Naming Considerations

The task description asks whether "blocked by" is the right name. For tasks, "blocked by" is accurate—the task literally cannot proceed. For softer idea relationships, alternatives include:

- **Depends on** — Implies ordering but could apply to tasks or ideas
- **Requires** — Similar to depends on
- **After** — Explicit ordering without implying hard blocking
- **Related to** — Current informal approach (no workflow implications)
- **Supersedes** / **Obsoletes** — For replacement relationships
- **Conflicts with** — For mutual exclusion

If ideas gained a formal relationship type, it should probably not be called "blocked by" to avoid confusion with task blocking semantics.

## Open Questions

### Should ideas support formal dependencies at all?

#### No, keep ideas isolated

Ideas remain independent by design. Authors use informal markdown links to note relationships. This preserves simplicity and aligns with the principle that ideas are vague until implementation. Any ordering or dependency should be expressed when ideas become tasks.

Pros: Simple, aligns with current design philosophy
Cons: Loses potentially valuable relationship information

#### Yes, add optional relationship metadata

Ideas could have an optional `## Relates To` section (or similar) with structured links. The relationship type (extends, conflicts, supersedes) would be noted in the link or section. Workflow commands could surface related ideas but would not block on them.

Pros: Captures useful context, helps with prioritization
Cons: Adds complexity, may encourage idea scope creep

### If relationships are added, should they affect workflow commands?

#### Display only

Relationships appear when viewing an idea (via `dust idea <slug>`) but don't affect listing or selection. The `dust ideas` command continues to show all ideas equally.

Pros: Zero workflow impact, purely informational
Cons: Limited utility if there's no workflow benefit

#### Soft signals in listing

The `dust ideas` output could annotate ideas with relationship counts or highlight ideas that supersede others. This nudges authors toward cleaning up obsolete ideas without hiding anything.

Pros: Gentle nudge toward hygiene, no hard blocking
Cons: Visual noise, could complicate output

#### Filter or group options

New flags like `dust ideas --no-superseded` or `dust ideas --conflicts` could filter the list. This gives users control without changing default behavior.

Pros: Flexible, opt-in complexity
Cons: More flags to learn, implementation effort

## Related Ideas

- [Task priority](task-priority.md) — Adds ordering metadata to tasks
- [Idea priority](idea-priority.md) — Adds ordering metadata to ideas

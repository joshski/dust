# Add Some Big Design Up Front Principle

Add a new principle under Lightweight Planning that formalizes when and how to invest in upfront design exploration.

The principle captures the economic shift that AI agents bring: when exploring alternatives becomes cheap, the optimal amount of upfront exploration increases. However, this doesn't mean returning to traditional BDUF — uncertainty about future requirements still limits what prediction can achieve. The principle guides agents and humans to explore thoroughly during the idea phase, then execute straightforwardly during tasks.

## Key Points

- AI agents lower the cost of architectural exploration, making heavier upfront investment rational
- "Lightweight" refers to task-level planning, not idea-level exploration
- Exploration should continue until clear trade-offs are identified (convergence-based, not time-boxed)
- Alternatives considered should be documented in ideas (in the body or Open Questions sections)
- If a task requires significant design decisions, it wasn't ready to be a task

## Principles

- [Lightweight Planning](../principles/lightweight-planning.md)
- [Task-First Workflow](../principles/task-first-workflow.md)
- [Traceable Decisions](../principles/traceable-decisions.md)

## Blocked By

(none)

## Definition of Done

- [ ] New principle file exists at `.dust/principles/some-big-design-up-front.md`
- [ ] Principle is linked as a sub-principle of Lightweight Planning
- [ ] Principle clearly states the convergence criteria for "enough" exploration
- [ ] Principle references the documentation of alternatives in ideas

# Some Big Design Up Front

AI agents lower the cost of architectural exploration, making heavier upfront investment rational during the idea phase.

Agile's rejection of "big design up front" (BDUF) was largely economic: detailed architecture was expensive to produce and often wrong. AI agents change that equation — they can explore multiple variants, prototype them, and measure trade-offs cheaply. When evaluating alternatives costs less, the expected value of avoiding large structural mistakes increases.

This doesn't mean returning to traditional BDUF. Uncertainty about future requirements still limits what prediction can achieve. The insight is that the optimal amount of upfront work has shifted, not that prediction became reliable.

The model is hybrid: thorough AI-assisted exploration during ideas, followed by straightforward execution during tasks. "Lightweight" refers to task-level planning, not idea-level exploration. Invest heavily in understanding alternatives during the idea phase, then decompose into atomic tasks once the direction is clear.

## Convergence Criteria

Exploration should continue until clear trade-offs are identified and the chosen approach can be articulated against alternatives. This is convergence-based, not time-boxed — simple ideas converge quickly, complex architectural decisions require more exploration.

When exploration feels "done":

- Multiple approaches have been considered
- Trade-offs between approaches are understood
- The chosen direction has clear justification
- Remaining uncertainty is about requirements, not design

If a task requires significant design decisions during execution, it wasn't ready to be a task.

## Documenting Alternatives

Ideas should document the alternatives considered and why they were ruled out. This creates a decision log that helps future agents and humans understand context. Include alternatives in the idea body or Open Questions sections.

## Parent Principle

- [Lightweight Planning](lightweight-planning.md)

## Sub-Principles

- (none)

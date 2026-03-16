# Some Big Design Up Front

AI agents dramatically lower the cost of architectural exploration, making heavier investment in early design rational.

## Economic Shift

Agile's rejection of "big design up front" (BDUF) was largely economic: detailed architecture was expensive to produce, slow to validate, and often wrong because humans could only explore a small portion of the design space before writing code. Iterative development was cheaper than prediction.

AI agents change that equation. An agent can read an entire codebase, generate multiple architectural variants, prototype them, run tests, and measure trade-offs in hours rather than weeks. When the cost of evaluating alternatives drops this much, the expected value of avoiding large structural mistakes increases — making heavier upfront investment rational.

## What Doesn't Change

AI does not eliminate the core reason Agile avoided heavy upfront design: uncertainty about future requirements. Product direction, user behavior, and organizational constraints still change in ways no design process can fully anticipate. The insight isn't that BDUF was wrong and is now right — it's that the optimal amount of upfront work has shifted.

## Hybrid Model

The likely outcome is not a return to traditional BDUF but a hybrid: extensive AI-assisted exploration of architectures early on, followed by iterative evolution as real requirements emerge. Architecture becomes less about committing to a single design early and more about rapidly searching the design space before implementation begins.

## Relationship to Dust

Dust already embodies this model. The workflow separates:

- **Ideas** — where exploration happens; can span multiple sessions, accumulate depth, include open questions
- **Tasks** — where execution happens; single-commit scope, precise boundaries

This maps to "big design during ideation, lightweight execution during tasks." The principle would formalize this pattern: invest heavily in understanding alternatives during the idea phase, then decompose into atomic tasks once the direction is clear.

## As a Principle

A "Some Big Design Up Front" principle could sit under [Lightweight Planning](../principles/lightweight-planning.md) as a clarification: lightweight doesn't mean no planning — it means appropriate planning, with the bulk of exploration happening in ideas rather than tasks.

The principle would guide both humans and agents:

- During idea refinement, explore multiple approaches before committing
- Document trade-offs and alternatives considered, not just the chosen path
- Use AI to prototype and compare options cheaply
- Once decomposed into tasks, execution should be straightforward — if a task requires significant design decisions, it wasn't ready to be a task

## Open Questions

### Where should this principle sit in the hierarchy?

#### Under Lightweight Planning

As a sub-principle of Lightweight Planning, emphasizing that "lightweight" refers to task-level planning, not idea-level exploration. This framing: "lightweight execution, thorough exploration."

#### Under Human-AI Collaboration

As a peer to Lightweight Planning, representing a distinct aspect of how AI changes the collaboration model. This positions it as a shift in the human-AI division of labor.

#### Under Agent Autonomy

As guidance for what agents should do during idea refinement — specifically, that agents should explore design space thoroughly before proposing decomposition into tasks.

### How much exploration is "some"?

#### Time-boxed exploration

Agents should explore for a fixed duration (e.g., one session) before moving to decomposition. Simple to implement but may under-explore complex ideas or over-explore simple ones.

#### Convergence-based

Agents should explore until they've identified clear trade-offs and can articulate why the chosen approach beats alternatives. More nuanced but harder to operationalize.

#### Human-gated

Exploration continues until a human approves the direction. Preserves human judgment but adds friction and blocks autonomy.

### Should the principle prescribe documentation of ruled-out alternatives?

#### Yes, document alternatives in ideas

Every idea should include a section listing approaches considered and why they were rejected. Creates a decision log and helps future agents/humans understand context.

#### No, focus on the chosen path

Documenting alternatives adds overhead and can become stale. The chosen approach should be justified on its own merits; the commit history provides sufficient context.

#### Optional based on complexity

For simple ideas, skip the alternatives section. For complex architectural decisions, include it. Let the agent judge based on the number of viable approaches discovered.

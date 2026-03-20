# Audit: Single Responsibility Violations

Review high-confidence single responsibility violations driven by responsibility count at function level.

Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically, then create new idea files in `./.dust/ideas/` for any issues you identify, avoiding duplication.

## Scope

Focus only on high-confidence function-level findings where one function clearly combines 3+ distinct responsibilities.

Responsibility examples:
- Parsing/validation
- Domain decision/execution logic
- Side effects or IO coordination
- Presentation/formatting/reporting
- Cross-module orchestration

Include both runtime code and test helpers.

Out of scope:
- Module-level layer-mixing findings (future slices)
- Collector/orchestrator hotspot findings based on collaborator/parameter load (future slices)
- Functions with only one or two responsibilities
- Ambiguous style-only concerns without clear responsibility boundaries
- Broad rewrite recommendations without clear extraction seams

## Analysis Steps

1. Identify runtime functions and test helpers that appear to mix concerns
2. Keep findings only when 3+ distinct responsibilities are clearly present in the same function
3. Validate a concrete extraction seam for each responsibility split (no speculative or style-only recommendations)
4. Keep recommendations incremental and high-confidence only
5. Preserve Functional Core, Imperative Shell boundaries by extracting pure logic from imperative shells where possible

## Output

For each finding, provide:
- **Location** - File path and function name where applicable
- **Responsibility split** - Distinct responsibilities currently mixed (for example parsing, execution, presentation)
- **Severity** - `high`, `medium`, or `low` based on extraction urgency and coupling risk
- **Suggested extraction plan** - A small-step plan describing what to extract first, with Functional Core, Imperative Shell boundaries preserved

## Blocked By

(none)

## Definition of Done

- Reviewed high-confidence function-level findings where 3+ distinct responsibilities are combined
- Included runtime code and test helpers in scope
- Documented each finding with location, responsibility split, severity, and suggested extraction plan
- Preserved Functional Core, Imperative Shell boundaries in recommendations
- Kept recommendations high-confidence only with clear concern boundaries
- Proposed ideas for substantial responsibility-splitting work identified
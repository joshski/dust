# Code Review Policies

A generic system for periodic, policy-driven code review that generates tasks rather than blocking commits.

## Concept

Review policies are prompts that run against commit history on a configurable cadence. Instead of immediate correction (linting), policies enable latent reflection — observing patterns that emerge over time and creating actionable follow-up work.

## Structure

```
.dust/policies/
  goal-alignment.md        # "Do recent changes align with our stated goals?"
  style-drift.md           # "Are we drifting from our conventions?"
  technical-debt.md        # "What debt has accumulated?"
  test-coverage-gaps.md    # "What new code lacks adequate tests?"
```

Each policy file contains a prompt describing what to look for.

## Mechanism

1. Track commits since each policy last ran (similar to `periodic-health-check-hook.md`)
2. When commit threshold is reached, run the policy prompt against recent changes
3. Policy outputs zero or more tasks to `.dust/tasks/`

## Key Insight

Policies can detect patterns that per-commit linting cannot:
- "We've accumulated 5 similar utilities that should be unified"
- "Recent changes have drifted from the dependency injection goal"
- "Test coverage has declined in the auth module over the last 20 commits"

## Trade-offs

**Benefits:**
- Non-blocking — maintains agent flow/velocity
- Contextual — sees the forest, not just trees
- Configurable — different projects have different concerns
- Asynchronous — reflection happens with broader context

**Risks:**
- Review fatigue if too many tasks generated
- "Periodic" can become "never" without discipline
- Some issues compound quickly and benefit from immediate feedback

## Relationship to Linting

Lint what's objective, review what's subjective:
- **Hard gates (lint)**: Type errors, syntax, broken links, formatting
- **Soft signals (policies)**: Design drift, goal alignment, accumulated debt

## Related Ideas

- [Periodic Health Check Hook](periodic-health-check-hook.md)
- [Catch Mistakes in Commit History](catch-mistakes-in-commit-history.md)

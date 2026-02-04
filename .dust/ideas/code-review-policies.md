# Code Review Policies

Built-in periodic review that generates tasks rather than blocking commits.

## Concept

Dust periodically reviews commit history against existing `.dust/` artifacts. Instead of immediate correction (linting), policies enable latent reflection — observing patterns that emerge over time and creating actionable follow-up work.

## Built-in Policies

Since dust already understands goals, facts, and ideas, reviews can be automatic:

- **Goal alignment**: Do recent commits align with `.dust/goals/`?
- **Fact staleness**: Do `.dust/facts/` still reflect the codebase?
- **Idea relevance**: Should any `.dust/ideas/` be promoted or pruned?
- **Pattern detection**: Are there repeated changes suggesting missing abstractions?

## Mechanism

1. Track commits since last review (similar to `periodic-health-check-hook.md`)
2. When commit threshold is reached, run built-in policies against recent changes
3. Generate zero or more tasks to `.dust/tasks/`

## Key Insight

Policies can detect patterns that per-commit linting cannot:
- "We've accumulated 5 similar utilities that should be unified"
- "Recent changes have drifted from the dependency injection goal"
- "The authentication fact no longer matches the code"

## Trade-offs

**Benefits:**
- Non-blocking — maintains agent flow/velocity
- Contextual — sees the forest, not just trees
- Zero configuration — uses existing `.dust/` structure
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

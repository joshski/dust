# Trunk-Based Development

Dust is designed to support a non-branching workflow where developers commit directly to a single main branch.

In trunk-based development, teams collaborate on code in one primary branch rather than maintaining multiple long-lived feature branches. This eliminates merge conflicts, enables continuous integration, and keeps the codebase continuously releasable.

The `dust loop claude` command embodies this philosophy: agents pull from main, implement a task, and push directly back to main. There are no feature branches, no pull requests, no merge queues. Each commit is atomic and complete.

This approach scales through discipline rather than isolation. Feature flags and incremental changes replace long-running branches. The repository history becomes a linear sequence of working states.

See: https://trunkbaseddevelopment.com/

## Parent Goal

- [Repository Hygiene](repository-hygiene.md)

## Sub-Goals

- [Atomic Commits](atomic-commits.md)

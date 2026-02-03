# Loop Review Process

Rework `dust loop claude` so that each iteration involves 2 steps instead of committing directly to main.

Steps:

1. **Create a branch for the change** — The implementing agent creates a branch (thereby marking it as WIP) and implements the change in that branch.

2. **Review and merge** — A separate agent (in a fresh sandbox) reviews the change and merges it into main.

This separation provides:
- Clear visibility into work-in-progress via branches
- Quality control through independent review
- Isolation between implementation and review contexts
- A natural checkpoint before changes land on main

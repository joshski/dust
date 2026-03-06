# Rename workflow-hints to hints

Rename `.dust/config/workflow-hints/` to `.dust/config/hints/`. Update all references in code, tests, and facts.

## Blocked By

(none)

## Definition of Done

- [ ] `WORKFLOW_HINT_PATHS` in `lib/artifacts/workflow-tasks.ts` updated to use `config/hints/`
- [ ] Tests updated to use new path
- [ ] Fact file `.dust/facts/workflow-tasks.md` updated
- [ ] All checks pass

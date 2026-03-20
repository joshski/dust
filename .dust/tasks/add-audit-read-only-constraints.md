# Add Audit Read-Only Constraints

Update audit templates to explicitly communicate that audits must not modify source code.

## Context

Audit tasks help maintain project health by reviewing code patterns and creating ideas for improvements. These tasks are explicitly read-only - they should produce ideas in `.dust/ideas/` but never modify source code. The current implementation provides guidance on what to do (create ideas) but doesn't explicitly state what not to do (modify code).

## Changes

1. **Expand `ideasHint` in `lib/audits/stock-audits.ts`**: Add explicit instruction stating "Do not modify source code - create ideas instead"

2. **Add Definition of Done item to each audit template**: Add "- No changes to files outside `.dust/`" as the final item in each audit's Definition of Done checklist, including:
   - All stock audits in `lib/audits/stock-audits.ts` (use `ideasHint`)
   - The checks audit in `lib/audits/checks-audit.ts`

## Principles

- [Agent Autonomy](../principles/agent-autonomy.md): Clear constraints enable agents to work productively without supervision
- [Task-First Workflow](../principles/task-first-workflow.md): Task instructions should clearly define the scope of allowed changes

## Blocked By

(none)

## Definition of Done

- `ideasHint` constant updated to include "Do not modify source code" instruction
- Every stock audit Definition of Done includes "No changes to files outside `.dust/`"
- Checks audit Definition of Done includes "No changes to files outside `.dust/`"
- All existing tests pass

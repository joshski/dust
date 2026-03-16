# Implement suggest-audits Audit

Add a new stock audit called `suggest-audits` that analyzes recent commits and creates tasks for relevant audits to run.

## Context

The current audit system provides 30 stock audits covering different aspects of codebase health. Selecting which audit to run is a manual decision requiring knowledge of what audits exist and which are relevant to recent work.

The `suggest-audits` audit follows the pattern established by `commit-review` — it analyzes recent commit history but focuses specifically on audit selection, producing tasks for which audits would be valuable based on what changed.

## Design Decisions

Based on resolved questions:

1. **Output format**: Create tasks (not ideas) for suggested audits. Tasks are actionable work items that go directly into the queue, providing a faster feedback loop for autonomous workflows.

2. **Commit range**: Analyze commits since the last `suggest-audits` run. The agent should check VCS history (e.g., `git log --grep="suggest-audits"`) to find when this audit was last run, then analyze commits since that point. Fall back to last 20 commits if no prior run exists.

3. **Selection logic**: Use AI reasoning rather than explicit rules. Provide the list of available audits with their descriptions and let the agent analyze commits to explain why specific audits would be valuable. This is more nuanced and adapts to new audits without maintenance.

## Implementation

Add a `suggestAudits()` function to `lib/audits/stock-audits.ts` that returns the audit template. The template should:

1. Instruct the agent to determine the commit range by checking VCS history for a prior `suggest-audits` commit
2. List all available audits (extracted from `stockAuditFunctions`) with their descriptions
3. Guide the agent to analyze commits and match changes to relevant audits
4. Create task files (not idea files) for each suggested audit, explaining why that audit is relevant given recent changes

Register in `stockAuditFunctions` as `'suggest-audits': suggestAudits`.

## Principles

- [Task-First Workflow](../principles/task-first-workflow.md) — Creates tasks as actionable work items, maintaining the progression from abstract to concrete
- [Lightweight Planning](../principles/lightweight-planning.md) — Suggestions are captured as tasks that can be evaluated and prioritized
- [Development Traceability](../principles/development-traceability.md) — The audit creates a visible connection between commit activity and audit suggestions
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) — Keep the audit template as pure data; the imperative work (git commands, file creation) happens at runtime via agent execution

## Blocked By

(none)

## Definition of Done

- [ ] New `suggestAudits` function in `lib/audits/stock-audits.ts`
- [ ] Function registered in `stockAuditFunctions` as `'suggest-audits'`
- [ ] Template instructs agent to check VCS history for prior runs
- [ ] Template lists available audits with descriptions
- [ ] Template instructs agent to create task files (not idea files)
- [ ] `bin/dust check` passes

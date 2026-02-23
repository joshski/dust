# Meta Audit

A stock audit that analyzes recent commits and creates ideas for relevant follow-up audits.

## Context

The current audit system (`lib/audits/stock-audits.ts`) provides 16 stock audits covering different aspects of codebase health. Each audit is independent and runs in isolation when invoked via `dust audit <name>`.

Currently, selecting which audit to run is a manual decision. A user or agent must know what audits are available and which ones are relevant to recent work.

The `ideas-from-commits` audit already reviews recent commit history (last 20 commits) to find improvement opportunities. The meta-audit follows a similar pattern but focuses specifically on audit selection—producing ideas that recommend which audits to run based on what changed.

## Proposed Implementation

Add a new stock audit called `suggest-audits` in `lib/audits/stock-audits.ts`:

```
# Suggest Audits Based On Commits

Review recent commit history and suggest which audits would be valuable to run.

## Scope

Analyze the last 20 commits to identify patterns that suggest specific audits:

1. **Path-based triggers**
   - `.dust/facts/*` changes → suggest `facts-verification` audit
   - `.dust/principles/*` changes → suggest `ideas-from-principles` audit
   - `*.test.*` or `__tests__/*` changes → suggest `test-coverage` audit
   - `package.json` or lockfile changes → suggest `security-review` audit
   - Error handling code changes → suggest `error-handling` audit

2. **Commit message patterns**
   - "refactor" in message → suggest `component-reuse` or `dead-code` audit
   - "fix" or "bug" in message → suggest `error-handling` or `test-coverage` audit
   - "perf" or "performance" in message → suggest `performance-review` or `data-access-review` audit

3. **Change size heuristics**
   - Large commits (many files) → suggest `agent-developer-experience` audit
   - Files with repeated modifications → suggest `refactoring-opportunities` audit

For each suggested audit, create an idea file explaining why that audit is relevant given the recent changes.

## Definition of Done

- [ ] Analyzed commits from the last 20 commits
- [ ] Identified file paths matching audit-relevant patterns
- [ ] Reviewed commit messages for relevant keywords
- [ ] Noted files with high churn that might need attention
- [ ] Created idea files for each suggested audit with context explaining why
```

## Alignment with Principles

- **[Task-First Workflow](../principles/task-first-workflow.md)** — The audit creates ideas (lightweight planning artifacts) rather than immediately running audits, maintaining the progression from abstract to concrete.
- **[Lightweight Planning](../principles/lightweight-planning.md)** — Suggestions are captured as ideas that can be evaluated before becoming tasks, avoiding over-automation.
- **[Development Traceability](../principles/development-traceability.md)** — The audit creates a connection between commit activity and audit suggestions, making the reasoning visible.

## Implementation Details

The implementation follows the existing stock audit pattern in `lib/audits/stock-audits.ts`:

1. Add a `suggestAudits()` function that returns the audit template
2. Register it in `stockAuditFunctions` with key `'suggest-audits'`
3. The audit instructions guide the agent to analyze commits and create ideas

The audit does not automate audit execution. It produces ideas explaining which audits would be valuable and why, letting the agent or user decide whether to proceed.

## Relationship to Other Audits

This audit complements `ideas-from-commits` which looks for general improvement opportunities. The meta-audit is specifically focused on suggesting other audits as follow-up work.

The path-based triggers mirror patterns already used in `pre-push.ts` for commit analysis (`parseGitDiffNameStatus`, file categorization by path).

# Meta Audit

A stock audit that analyzes recent commits and suggests which audits would be valuable to run.

## Context

The current audit system (`lib/audits/stock-audits.ts`) provides 30 stock audits covering different aspects of codebase health. Each audit is independent and runs in isolation when invoked via `dust audit <name>`.

Currently, selecting which audit to run is a manual decision. A user or agent must know what audits are available and which ones are relevant to recent work.

The `commit-review` audit already reviews recent commit history to find refactoring opportunities. The meta-audit follows a similar pattern but focuses specifically on audit selection—producing suggestions for which audits to run based on what changed.

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
   - `*.test.*` or `__tests__/*` changes → suggest `test-pyramid` or `slow-tests` audit
   - `package.json` or lockfile changes → suggest `security-review` audit
   - Error handling code changes → suggest `error-handling` audit

2. **Commit message patterns**
   - "refactor" in message → suggest `component-reuse` or `dead-code` audit
   - "fix" or "bug" in message → suggest `error-handling` or `test-assertions` audit
   - "perf" or "performance" in message → suggest `feedback-loop-speed` or `data-access-review` audit

3. **Change size heuristics**
   - Large commits (many files) → suggest `agent-developer-experience` audit
   - Files with repeated modifications → suggest `refactoring-opportunities` audit

For each suggested audit, create an idea file explaining why that audit is relevant given the recent changes.

## Definition of Done

- Analyzed commits from the last 20 commits
- Identified file paths matching audit-relevant patterns
- Reviewed commit messages for relevant keywords
- Noted files with high churn that might need attention
- Created idea files for each suggested audit with context explaining why
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

## Open Questions

### Should the audit create ideas or tasks?

#### Create Ideas

The proposal creates "idea files explaining why that audit is relevant." Ideas are lightweight proposals that require explicit progression to become tasks. This aligns with [Lightweight Planning](../principles/lightweight-planning.md) and how other audits work—they create ideas via the standard `ideasHint` pattern. The agent or human can then decide which suggested audits to actually run.

Preserves human oversight, avoids task queue bloat, matches existing audit patterns.

#### Create Tasks

Tasks are actionable work items that go directly into the queue. Running `dust audit suggest-audits` would create multiple `audit-*` task files ready for execution.

Faster feedback loop, more useful for autonomous workflows, simpler mental model.

### How should the audit determine the commit range?

#### Time-Based Window

Always analyze the last N commits (e.g., 20) or a fixed time window. No persistent state needed. Simpler, works immediately, matches `commit-review` fallback behavior.

May re-suggest audits for commits already reviewed.

#### Commit Reference Marker

Store the last processed commit SHA in a marker file (e.g., `.dust/done/suggest-audits`). Requires implementing the `.dust/done/` pattern that `commit-review` references but doesn't exist yet.

Precise tracking, no redundant suggestions. Adds complexity, requires new artifact type.

### Should audit selection use explicit rules or AI reasoning?

#### Explicit Trigger Rules

Define mappings in the audit template: `.dust/facts/*` → `facts-verification`, "refactor" in message → `component-reuse`, etc. Predictable, reproducible, fast, easy to debug.

Brittle, requires maintenance, may miss nuanced cases.

#### AI Reasoning

Provide available audits with descriptions. Let the AI analyze commits and explain why specific audits would be valuable. More nuanced, adapts to new audits, can explain reasoning.

Less predictable, higher token cost, may hallucinate relevance.

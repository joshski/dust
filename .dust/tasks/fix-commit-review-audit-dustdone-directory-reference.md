# Fix commit-review audit .dust/done/ directory reference

Fix incorrect `.dust/done/` directory reference in commit-review audit. The audit instructs agents to check a nonexistent directory when determining the commit range.

## Principles

- [Actionable Errors](../principles/actionable-errors.md) - Error messages and instructions should tell you what to do next, not just what went wrong.
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Separate code into a pure "functional core" and a thin "imperative shell."

## Guidance

### Actionable Errors

Error messages should tell you what to do next, not just what went wrong.

When something fails, the message should provide:
- A clear description of the problem
- Specific guidance on how to fix it
- Context needed to take the next step

This is especially important for AI agents, who need concrete instructions to recover autonomously. A good error message turns a dead end into a signpost.

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

## Current Problem

In `lib/audits/stock-audits.ts:1011`, the commit-review audit says:

```
Analyze commits since the last commit-review audit (check `.dust/done/` for previous runs).
```

This is incorrect because:
1. There is no `.dust/done/` directory in dust's directory structure
2. The correct way to check when an audit was last run is through git history
3. Agents following this guidance will be confused when the directory doesn't exist

## Correct Approach

Audits should be tracked via git commit history. When an audit completes, it creates a commit with the prefix "Audit: <name>". To find the last time an audit ran, agents should search git history:

```bash
git log --grep="Audit: Commit Review" -1 --format=%H
```

If no previous run is found, fall back to analyzing the last N commits (e.g., 20).

## Implementation

Update the commit-review audit's `## Scope` section (around line 1009-1011 in `lib/audits/stock-audits.ts`) to match the pattern used in the `suggest-audits` audit (lines 2580-2586).

Replace the incorrect guidance with:

```
## Scope

Determine which commits to analyze:

1. Check VCS history for a prior commit-review run: `git log --grep="Audit: Commit Review" -1 --format=%H`
2. If found, analyze commits since that commit
3. If not found, analyze the last 20 commits as a fallback

Focus on these signals:
```

Then continue with the existing numbered list of signals (file churn, size growth, etc.).

## Task Type

implement

## Blocked By

(none)

## Definition of Done

- The incorrect `.dust/done/` reference is removed from `lib/audits/stock-audits.ts`
- The `## Scope` section now includes correct git-based instructions for finding the last audit run
- The instructions match the pattern used in the `suggest-audits` audit
- Agents will receive actionable, correct instructions for determining the commit range to analyze

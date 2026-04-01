# Fix commit-review audit .dust/done/ directory reference

The `commit-review` stock audit incorrectly instructs agents to "check `.dust/done/` for previous runs" when determining the commit range to analyze. This directory does not exist and has never existed in dust.

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

## Proposed Fix

Update the commit-review audit's Scope section to correctly instruct agents on finding the previous audit run via git history, matching the pattern used in the `suggest-audits` audit which correctly handles this scenario.

Replace the incorrect guidance with something like:

```
Determine which commits to analyze:

1. Check VCS history for a prior commit-review run: `git log --grep="Audit: Commit Review" -1 --format=%H`
2. If found, analyze commits since that commit
3. If not found, analyze the last 20 commits as a fallback
```

# Duplicate Code in Recent Commits Audit

Add a stock audit that reviews recent commits for newly introduced duplicate code.

## Context

The existing `component-reuse` audit scans the entire codebase for repeated patterns and copy-pasted code. However, it doesn't distinguish between historical duplication and code that was just introduced. Reviewing all duplication at once can be overwhelming and hard to action.

A commit-focused audit would catch duplication at the point of introduction, when the context is fresh and the fix is simpler. This aligns with the [Reasonably DRY](../principles/reasonably-dry.md) principle: extract shared code "when the duplication is truly about the same concept and has proven stable."

The `ideas-from-commits` audit already analyzes recent commit history but focuses on technical debt and incomplete work rather than code similarity. A duplicate code audit would complement it by specifically looking for copy-paste patterns in diffs.

## Proposed Implementation

Add a stock audit called `duplicate-code` in [`lib/audits/stock-audits.ts`](../../lib/audits/stock-audits.ts):

```
# Duplicate Code in Recent Commits

Review recent commits for newly introduced duplicate code patterns.

## Scope

Analyze diffs from the last 20 commits to identify:

1. **Copy-pasted functions** - Functions added in different commits that are identical or near-identical
2. **Repeated logic blocks** - Code blocks (5+ lines) that appear multiple times in recent changes
3. **Parallel implementations** - Similar solutions to the same problem added in different files
4. **Missed extraction opportunities** - Helper functions that could have been reused instead of rewritten

## Analysis Steps

1. Run `git log -n 20 --pretty=format:"%H" --diff-filter=A` to get commits with added files
2. For each commit, extract added code using `git diff-tree`
3. Compare added code blocks across commits for similarity
4. Flag instances where identical or near-identical code appears in multiple places
5. Consider whether the duplication represents the same concept or coincidental similarity

## Output

For each duplicate pattern identified:
- **Files involved** - Which files contain the duplicated code
- **Commits** - Which commits introduced each instance
- **Similarity** - Exact copy or near-duplicate (note differences)
- **Recommendation** - Extract to shared location, leave as-is, or needs human judgment

## Principles

- [Reasonably DRY](../principles/reasonably-dry.md) - Extract only when duplication represents the same concept
- [Atomic Commits](../principles/atomic-commits.md) - Each commit should be self-contained
- [Traceable Decisions](../principles/traceable-decisions.md) - Understand why code was duplicated

## Blocked By

(none)

## Definition of Done

- Analyzed diffs from the last 20 commits
- Identified functions or code blocks that were copy-pasted
- Distinguished intentional parallel implementations from accidental duplication
- Created ideas for extraction opportunities worth pursuing
```

## Relationship to Existing Audits

This audit complements rather than replaces `component-reuse`:

| Aspect | component-reuse | duplicate-code |
|--------|-----------------|----------------|
| Scope | Entire codebase | Last 20 commits |
| Focus | All repeated patterns | Newly introduced duplication |
| Trigger | On-demand | After recent changes |
| Actionability | May surface old debt | Fresh context for fixes |

The `ideas-from-commits` audit could potentially incorporate this check, but a separate audit allows running it independently when focusing specifically on code quality in recent work.

## Open Questions

### Should similarity detection be automated or agent-driven?

#### Agent-driven analysis

The audit provides guidance and lets the agent identify duplicates using code search and diff tools. Simpler to implement, leverages agent judgment, but may miss patterns.

#### Automated detection with agent review

Build tooling (e.g., integrate jscpd or similar) to detect duplicates, then have the agent review findings. More thorough but adds complexity and dependencies.

### How should "near-duplicate" be defined?

#### Exact match only

Only flag code that is character-for-character identical (ignoring whitespace). Simple and unambiguous but misses renamed variables or minor variations.

#### Similarity threshold

Flag code that is above a similarity threshold (e.g., 80% similar). Catches more duplication but may produce false positives when code is structurally similar but semantically different.

#### Agent judgment

Let the agent decide what constitutes meaningful duplication. Most flexible but may be inconsistent across runs.

### Should this audit integrate with component-reuse or remain separate?

#### Separate audit

Keep as distinct audit with different scope and purpose. Users choose which to run based on needs. Clearer intent but adds to audit count.

#### Extend component-reuse

Add a `--recent` flag or similar to `component-reuse` to limit scope to recent commits. Reuses existing audit but may complicate the audit's focus.

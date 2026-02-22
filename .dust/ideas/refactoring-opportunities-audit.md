# Refactoring Opportunities Audit

An audit that analyzes recent commits to identify opportunities for refactoring.

## Context

The existing `ideas-from-commits` audit (`lib/audits/stock-audits.ts:167-199`) reviews recent commit history to find follow-up improvement ideas, focusing on technical debt, incomplete work, pattern opportunities, and test gaps. A refactoring-focused audit would complement this by specifically looking for code that could benefit from structural improvements.

Recent commits often reveal refactoring opportunities through several signals:
- **Growing files** - Files that have been modified frequently or have grown significantly
- **Scattered changes** - Multiple commits touching the same areas, suggesting coupling issues
- **Feature sprawl** - New functionality added without corresponding abstractions
- **Copy-paste patterns** - Similar code added in multiple places

The pre-push hook (`lib/cli/commands/pre-push.ts:26-143`) already demonstrates patterns for analyzing git diffs and categorizing file changes. This infrastructure could be reused to detect refactoring signals.

## Relevant Principles

- [Boy Scout Rule](../principles/boy-scout-rule.md) - Leave code better than found, but capture large cleanups as separate tasks
- [Make the Change Easy](../principles/make-the-change-easy.md) - Refactor until the change becomes straightforward
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md) - Tests and checks enable safe refactoring
- [Reasonably DRY](../principles/reasonably-dry.md) - Extract only when duplication represents the same concept

## Related Ideas

- [Meta Audit](meta-audit.md) - Could trigger this audit based on commit patterns
- [Commit Log Observations](commit-log-observations.md) - Scanning commits for patterns
- [Integrate FTA](integrate-fta.md) - Measuring code complexity
- [Catch Mistakes in Commit History](catch-mistakes-in-commit-history.md) - Detecting suspicious changes

## Open Questions

### What signals should indicate refactoring opportunities?

#### Option: File churn analysis

Track which files have been modified most frequently over recent commits. High-churn files may need structural improvement to reduce the frequency of changes. Simple to implement with `git log --name-only`.

#### Option: Size growth detection

Compare file sizes before and after recent commits. Rapid growth suggests added complexity that might benefit from extraction. Requires diffing current state against historical snapshots.

#### Option: Commit message patterns

Look for commits mentioning "fix", "another", "also", or similar words that suggest incremental additions to existing code. Depends on commit message quality but leverages existing conventions.

#### Option: All of the above

Combine multiple signals for a more comprehensive analysis. Each signal catches different refactoring needs; together they provide broader coverage.

### How should the audit present its findings?

#### Option: Ranked list of files

Present a prioritized list of files most likely to benefit from refactoring, with reasons for each. Straightforward to action but doesn't suggest specific refactorings.

#### Option: Specific refactoring suggestions

Analyze the code and suggest concrete refactorings (extract function, split file, introduce abstraction). More actionable but requires deeper analysis and may be wrong.

#### Option: File groupings

Cluster related files that change together, suggesting they may need better organization or abstraction. Reveals structural issues but requires interpretation.

### Should the audit distinguish between different types of refactoring?

#### Option: Unified recommendations

Treat all refactoring opportunities the same way, creating ideas for any improvements identified. Simple and consistent with existing audit patterns.

#### Option: Categorized by type

Distinguish between extraction opportunities, file splitting, renaming, and other refactoring types. Helps prioritize by effort level but adds complexity.

### What time window should the audit analyze?

#### Option: Fixed commit count

Analyze the last 20 commits, matching the `ideas-from-commits` audit. Consistent and predictable.

#### Option: Configurable window

Allow users to specify the number of commits or a time period. Flexible but adds configuration burden.

#### Option: Since last refactoring audit

Track when this audit was last run and analyze commits since then. Ensures coverage but requires state tracking.

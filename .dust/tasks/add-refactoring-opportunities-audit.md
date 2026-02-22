# Add Refactoring Opportunities Audit

Add a stock audit that analyzes recent commits to identify refactoring opportunities.

## Context

The existing `ideas-from-commits` audit (`lib/audits/stock-audits.ts:206-239`) reviews recent commit history for follow-up improvement ideas. This complements it with a refactoring-focused audit that identifies code needing structural improvements.

The audit should:

1. **Analyze multiple signals** - File churn, size growth, and commit message patterns
2. **Suggest specific refactorings** - Concrete recommendations rather than just file lists
3. **Unified recommendations** - Treat all refactoring opportunities consistently
4. **Track last run** - Analyze commits since the last refactoring audit rather than a fixed count

The pre-push hook (`lib/cli/commands/pre-push.ts`) demonstrates patterns for analyzing git diffs that can be reused.

## Principles

- [Boy Scout Rule](../principles/boy-scout-rule.md) - Leave code better than found, but capture large cleanups as separate tasks
- [Make the Change Easy](../principles/make-the-change-easy.md) - Refactor until the change becomes straightforward
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md) - Tests and checks enable safe refactoring
- [Reasonably DRY](../principles/reasonably-dry.md) - Extract only when duplication represents the same concept

## Blocked By

(none)

## Definition of Done

- [ ] New `refactoring-opportunities` audit added to `lib/audits/stock-audits.ts`
- [ ] Audit template includes scope for file churn, size growth, and commit patterns
- [ ] Audit instructions guide analysis of commits since last refactoring audit
- [ ] Audit outputs specific refactoring suggestions (not just file lists)
- [ ] Audit appears in `bin/dust audit list` output
- [ ] Audit can be run via `bin/dust audit run refactoring-opportunities`

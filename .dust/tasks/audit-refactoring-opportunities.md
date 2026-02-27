# Audit: Refactoring Opportunities

Analyze recent commits to identify code needing structural improvements.

Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically, then create new idea files in `./.dust/ideas/` for any issues you identify, avoiding duplication.

## Scope

Analyze commits since the last refactoring-opportunities audit (check `.dust/done/` for previous runs). Focus on these signals:

1. **File churn** - Files modified frequently across multiple commits may have unclear responsibilities or be accumulating technical debt
2. **Size growth** - Files that have grown significantly may benefit from decomposition
3. **Commit message patterns** - Look for messages containing "fix", "workaround", "temporary", "hack", or "TODO" that indicate shortcuts taken

## Analysis Steps

1. Run `git log --since="<last-audit-date>" --name-only --pretty=format:"COMMIT:%s"` to get commits with their messages and changed files
2. Count file modification frequency to identify high-churn files
3. Check current sizes of frequently-modified files with `wc -l`
4. Review commit messages for patterns suggesting technical debt

## Output

For each refactoring opportunity identified, provide:
- **File path** - The specific file needing attention
- **Signal** - What triggered this recommendation (churn, size, commit pattern)
- **Specific suggestion** - A concrete refactoring action (e.g., "Extract the validation logic into a separate module", not just "consider refactoring")

## Principles

- [Boy Scout Rule](../principles/boy-scout-rule.md) - Leave code better than found, but capture large cleanups as separate tasks
- [Make the Change Easy](../principles/make-the-change-easy.md) - Refactor until the change becomes straightforward
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md) - Tests and checks enable safe refactoring
- [Reasonably DRY](../principles/reasonably-dry.md) - Extract only when duplication represents the same concept

## Blocked By

(none)

## Definition of Done

- [ ] Identified high-churn files (modified in 3+ commits since last audit)
- [ ] Flagged files exceeding 300 lines that grew significantly
- [ ] Noted commits with concerning message patterns
- [ ] Provided specific refactoring suggestions for each opportunity
- [ ] Created ideas for any substantial refactoring work identified
# Implement Commit Message Quality Audit

Add a `commit-message-quality` stock audit that reviews recent commits for message quality and traceability.

## Context

The [Traceable Decisions](../principles/traceable-decisions.md) principle emphasizes that commit history should explain why changes were made. The ideas-from-commits audit looks for improvement opportunities, but doesn't evaluate message quality itself. Good commit messages help agents understand project history and make better decisions.

## Requirements

### Analysis Scope

1. **Generic messages** - Identify commits with non-descriptive messages ("fix", "update", "WIP", "changes")
2. **Missing why** - Find commits that describe what changed but not why
3. **Breaking changes** - Flag breaking commits without explanation of impact
4. **Multi-concern commits** - Detect commits that bundle unrelated changes
5. **Missing links** - Identify commits without links to related issues or tasks

### Output

For each quality issue found, the audit should guide agents to document:
- Commit hash and message
- Type of issue (generic, missing why, breaking without impact, multi-concern, missing links)
- Suggested improvement for future commits

### Stock Audit Registration

Register `commit-message-quality` in `lib/audits/stock-audits.ts` following the existing pattern.

## Principles

- [Traceable Decisions](../principles/traceable-decisions.md) - Commit history should explain why changes were made
- [Atomic Commits](../principles/atomic-commits.md) - Each commit should tell a complete story
- [Agent Autonomy](../principles/agent-autonomy.md) - Agents learn from commit history to understand project patterns

## Blocked By

(none)

## Definition of Done

- [ ] `commit-message-quality` stock audit template added to `lib/audits/stock-audits.ts`
- [ ] Audit registered in `stockAuditFunctions` map
- [ ] Template includes instructions for detecting generic commit messages
- [ ] Template includes instructions for finding commits missing "why" context
- [ ] Template includes instructions for flagging undocumented breaking changes
- [ ] Template includes instructions for detecting multi-concern commits
- [ ] Template includes instructions for checking for issue/task links
- [ ] Template includes Principles section linking to relevant principles
- [ ] `bin/dust check` passes
- [ ] `bin/dust audit` lists the new audit

# Implement Agent Instruction Quality Audit

Add an `agent-instruction-quality` stock audit that reviews agent instruction files (AGENTS.md, CLAUDE.md) for clarity and completeness.

## Context

Agent instruction files directly impact agent effectiveness. Poor instructions lead to wasted context, confusion, and suboptimal decisions. This complements the agent-developer-experience audit with a focus on the instruction artifacts themselves.

## Requirements

### Analysis Scope

1. **Contradictory instructions** - Find conflicting guidance across instruction files
2. **Stale references** - Identify instructions that reference removed code or features
3. **Missing context** - Detect areas where agents frequently need information not provided
4. **Verbose instructions** - Flag overly long sections that waste context window space
5. **Linter-replaceable rules** - Identify instructions that could be enforced by linter rules instead

### Output

For each issue found, the audit should guide agents to document:
- Location (file and section)
- Type of issue (contradictory, stale, missing, verbose, linter-replaceable)
- Impact on agent effectiveness
- Suggested improvement

### Stock Audit Registration

Register `agent-instruction-quality` in `lib/audits/stock-audits.ts` following the existing pattern.

## Principles

- [Agent Autonomy](../principles/agent-autonomy.md) - Clear instructions enable autonomous work
- [Context Window Efficiency](../principles/context-window-efficiency.md) - Concise instructions leave room for reasoning
- [Actionable Errors](../principles/actionable-errors.md) - Instructions should guide agents toward correct actions
- [Lint Everything](../principles/lint-everything.md) - Prefer static analysis over runtime guidance where possible

## Blocked By

(none)

## Definition of Done

- [ ] `agent-instruction-quality` stock audit template added to `lib/audits/stock-audits.ts`
- [ ] Audit registered in `stockAuditFunctions` map
- [ ] Template includes instructions for finding contradictory guidance
- [ ] Template includes instructions for detecting stale references
- [ ] Template includes instructions for identifying missing context
- [ ] Template includes instructions for flagging verbose sections
- [ ] Template includes instructions for finding linter-replaceable rules
- [ ] Template includes Principles section linking to relevant principles
- [ ] `bin/dust check` passes
- [ ] `bin/dust audit` lists the new audit

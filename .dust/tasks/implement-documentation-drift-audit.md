# Implement Documentation Drift Audit

Add a `documentation-drift` stock audit that reviews code documentation for accuracy against current implementation.

## Context

The facts-verification audit checks `.dust/facts/`, but code-level documentation (JSDoc, README sections, inline comments) can also drift from reality. Outdated docs mislead agents who may trust incorrect parameter descriptions, wrong return types, or stale code examples.

## Requirements

### Analysis Scope

1. **JSDoc descriptions** - Check if function descriptions match actual behavior
2. **Parameter documentation** - Identify docs for removed or renamed parameters
3. **Return type documentation** - Find return type docs that contradict actual types
4. **README code examples** - Verify that code examples compile and run
5. **Inline comments** - Review comments describing code that has changed

### Output

For each drift found, the audit should guide agents to document:
- Location (file and line)
- What the documentation claims
- What the code actually does
- Suggested fix (update docs, remove stale docs, or add missing docs)

### Stock Audit Registration

Register `documentation-drift` in `lib/audits/stock-audits.ts` following the existing pattern.

## Principles

- [Agent Autonomy](../principles/agent-autonomy.md) - Accurate documentation enables agents to work without trial and error
- [Context Window Efficiency](../principles/context-window-efficiency.md) - Incorrect docs waste context on misleading information
- [Maintainable Codebase](../principles/maintainable-codebase.md) - Up-to-date documentation reduces maintenance burden

## Blocked By

(none)

## Definition of Done

- [ ] `documentation-drift` stock audit template added to `lib/audits/stock-audits.ts`
- [ ] Audit registered in `stockAuditFunctions` map
- [ ] Template includes instructions for comparing JSDoc to function behavior
- [ ] Template includes instructions for checking parameter documentation
- [ ] Template includes instructions for verifying return type documentation
- [ ] Template includes instructions for testing README code examples
- [ ] Template includes guidance for reviewing inline comments
- [ ] Template includes Principles section linking to relevant principles
- [ ] `bin/dust check` passes
- [ ] `bin/dust audit` lists the new audit

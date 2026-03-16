# Implement Feedback Loop Speed Audit

Add a `feedback-loop-speed` stock audit that measures and reports on check/test execution times to identify bottlenecks.

## Context

The [Fast Feedback Loops](../principles/fast-feedback-loops.md) principle emphasizes that agents benefit from quick feedback. The performance-review audit covers general performance, but a focused audit on the development feedback loop would directly address agent productivity by identifying which checks consume the most time.

## Requirements

### Analysis Scope

1. **Time to run `dust check`** - Aggregate and per-check breakdown
2. **Test suite execution time** - Total and slowest individual tests
3. **Type checking duration** - Time spent on TypeScript/type checking
4. **Linting duration** - Time spent on lint checks
5. **Build time** - Time to compile/bundle if applicable
6. **Identify dominant checks** - Flag checks that consume disproportionate time

### Output Format

Report timing data without prescribing thresholds. Different projects have different acceptable speeds, so the audit should:
- Present raw timing data for each component
- Highlight the slowest components as a percentage of total time
- Let users interpret what needs attention

### Stock Audit Registration

Register `feedback-loop-speed` in `lib/audits/stock-audits.ts` following the existing pattern.

## Principles

- [Fast Feedback Loops](../principles/fast-feedback-loops.md) - Directly measures feedback loop speed
- [Fast Feedback](../principles/fast-feedback.md) - Identifies bottlenecks in feedback delivery
- [Agent Autonomy](../principles/agent-autonomy.md) - Faster feedback means agents can iterate more within context limits

## Blocked By

(none)

## Definition of Done

- [ ] `feedback-loop-speed` stock audit template added to `lib/audits/stock-audits.ts`
- [ ] Audit registered in `stockAuditFunctions` map
- [ ] Template includes instructions for measuring `dust check` timing
- [ ] Template includes instructions for measuring test suite execution time
- [ ] Template includes instructions for identifying slowest individual tests
- [ ] Template includes instructions for measuring type checking duration
- [ ] Template includes instructions for measuring lint duration
- [ ] Template includes guidance for reporting dominant checks by time percentage
- [ ] Template includes Principles section linking to relevant principles
- [ ] `bin/dust check` passes
- [ ] `bin/dust audit` lists the new audit

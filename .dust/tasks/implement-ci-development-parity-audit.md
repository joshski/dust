# Implement CI / Development Parity Audit

Add a `ci-development-parity` stock audit that identifies discrepancies between checks run locally via `dust check` and those run in CI.

## Context

When developers run different checks locally than CI runs remotely, several problems emerge:

1. **False confidence** - CI might pass while local checks fail, or vice versa
2. **Wasted cycles** - Developers push code that passes locally only to have CI fail
3. **Agent confusion** - AI agents rely on consistent feedback; discrepancies trigger incorrect debugging paths

The audit should create idea files for each gap found, following the pattern of other audits like `checks-audit`.

## Requirements

### Analysis

1. **Detect local checks** - Read `.dust/config/settings.json` to identify checks configured for `dust check`
2. **Parse CI configuration** - Use the existing `detectCIChecks` function from `checks-audit.ts` to parse CI workflows
3. **Bidirectional comparison**:
   - Checks in dust but not in CI (local-only checks)
   - Checks in CI but not in dust (CI-only checks)
4. **Pattern matching for indirect references** - Follow one level of indirection for common commands like `npm run check` or `./scripts/check.sh`

### Output

For each gap found, the audit should guide agents to create an idea file with:
- Which side is missing the check (local or CI)
- Suggested fix (add to CI or add to dust config)
- Example configuration or workflow snippet

### Stock Audit Registration

Register `ci-development-parity` in `lib/audits/stock-audits.ts` following the existing pattern.

## Implementation Notes

### Functional Core, Imperative Shell

The existing `checks-audit.ts` provides pure functions (`detectCIChecks`, `detectConfiguredChecks`) that should be reused. The new audit template provides instructions for agents to analyze gaps; it does not need additional runtime code beyond the template.

### Reuse Existing Infrastructure

- `detectCIChecks(ciFiles)` in `checks-audit.ts` parses CI files and returns detected check categories
- `detectConfiguredChecks(settings)` extracts check categories from dust settings
- The `ideasHint` constant guides agents to create idea files

## Principles

- [Reproducible Checks](../principles/reproducible-checks.md) - Ensures same checks run everywhere
- [Stop the Line](../principles/stop-the-line.md) - Problems are caught at source, not downstream
- [Fast Feedback Loops](../principles/fast-feedback-loops.md) - Developers get consistent feedback locally before pushing
- [Agent Autonomy](../principles/agent-autonomy.md) - Agents can trust that passing local checks means CI will pass
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Reuse pure analysis functions from checks-audit

## Blocked By

(none)

## Definition of Done

- [ ] `ci-development-parity` stock audit template added to `lib/audits/stock-audits.ts`
- [ ] Audit registered in `stockAuditFunctions` map
- [ ] Template includes instructions for bidirectional gap detection
- [ ] Template includes guidance for pattern matching on indirect references
- [ ] Template includes guidance for creating idea files per gap
- [ ] Template includes Principles section linking to relevant principles
- [ ] `bin/dust check` passes
- [ ] `bin/dust audit` lists the new audit

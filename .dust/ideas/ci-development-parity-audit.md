# CI / Development Parity Audit

Add a stock audit that identifies discrepancies between checks run locally and those run in CI.

## Context

The [Reproducible Checks](../principles/reproducible-checks.md) principle states that every check must produce the same result regardless of who runs it, when, or on what machine. The [Environment-Independent Tests](../principles/environment-independent-tests.md) principle similarly states that tests must produce the same result regardless of where they run.

When developers run different checks locally than CI runs remotely, several problems emerge:

1. **False confidence** - CI might pass while local checks fail, or vice versa, leading developers to believe code is ready when it isn't
2. **Wasted cycles** - Developers may push code that passes locally only to have CI fail, requiring additional round-trips
3. **Inconsistent quality gates** - Different quality standards apply depending on where code is checked
4. **Agent confusion** - AI agents rely on consistent feedback; discrepancies between local and CI behavior can trigger incorrect debugging paths

### Related Ideas

- [Warn When CI Does Not Run dust check](warn-when-ci-does-not-run-dust-check.md) - proposes warning when CI workflows exist but don't run `dust check`

### Existing Infrastructure

The `checks-audit.ts` module already provides:

- `detectCIChecks(ciFiles)` - parses CI configuration files to detect what checks run in CI
- `detectConfiguredChecks(settings)` - extracts check categories from dust settings
- `suggestChecks(...)` - suggests missing checks based on detected discrepancies

The `checks-audit` stock audit analyzes check coverage but focuses on adding missing checks to dust config, not on aligning CI with local development.

## Proposed Audit Scope

A `ci-development-parity` stock audit would:

1. **List local checks** - Read `.dust/config/settings.json` to identify checks configured for `dust check`
2. **Parse CI configuration** - Detect CI workflows (GitHub Actions, GitLab CI, CircleCI, etc.) and extract commands they run
3. **Identify parity gaps**:
   - Checks run locally but not in CI
   - Checks run in CI but not configured in dust
   - Different commands for the same logical check (e.g., `npm test` vs `vitest run`)
4. **Suggest fixes**:
   - If CI doesn't run `dust check`, suggest adding it
   - If CI runs ad-hoc commands, suggest migrating to `dust check` for consistency
   - If checks are asymmetric, document which side is missing what

## Principle Alignment

- [Reproducible Checks](../principles/reproducible-checks.md) - Ensures same checks run everywhere
- [Stop the Line](../principles/stop-the-line.md) - Problems are caught at source, not downstream
- [Fast Feedback Loops](../principles/fast-feedback-loops.md) - Developers get consistent feedback locally before pushing
- [Agent Autonomy](../principles/agent-autonomy.md) - Agents can trust that passing local checks means CI will pass

## CI Integration Guidance

When gaps are found, the audit should suggest one of:

**Option A: Run `dust check` in CI**

```yaml
# .github/workflows/ci.yml
- name: Run quality checks
  run: ./bin/dust check --serial
```

The `--serial` flag is recommended for CI environments that may be resource-constrained or where parallel execution causes issues.

**Option B: Run `dust check --serial` for slow environments**

Some CI runners have limited parallelism or memory. The `--serial` flag runs checks one at a time, which is slower but more reliable in constrained environments.

## Open Questions

### Should the audit create ideas or just report findings?

#### Option: Create idea files for each gap

Follow the pattern of other audits (`checks-audit`, `ideas-from-commits`) that create idea files for actionable findings. Each gap becomes an idea with context and suggested fix.

Pros: Consistent with existing audit patterns; creates trackable artifacts
Cons: May create many small ideas for what is essentially one action (add `dust check` to CI)

#### Option: Report findings inline with single recommendation

Output a summary of gaps directly, with a single recommendation to add `dust check` to CI. Skip creating separate idea files.

Pros: Simpler for the common case; avoids idea proliferation
Cons: Inconsistent with other audits; no artifact trail

### Should the audit warn about CI checks not in dust?

#### Option: Yes, bidirectional parity

If CI runs checks that aren't in dust config, flag them. This ensures developers can reproduce CI behavior locally.

Pros: Full parity; developers can debug CI failures locally
Cons: Some CI-only checks (e.g., deployment, secrets scanning) may be intentionally CI-only

#### Option: No, focus on dust → CI direction

Only check that dust checks are present in CI. Don't warn about CI-only checks.

Pros: Simpler; avoids false positives for intentional CI-only checks
Cons: Doesn't help developers reproduce CI behavior locally

### How should the audit handle indirect references?

#### Option: Pattern matching on common commands

Look for patterns like `npm run check`, `make check`, `./scripts/check.sh` and follow one level of indirection to see what they run.

Pros: More accurate detection
Cons: Complex to implement; may still miss some cases

#### Option: Direct reference detection only

Only detect explicit `dust check` references. Document that indirect invocations exist but can't be reliably detected.

Pros: Simple and predictable
Cons: May produce false positives for repos that run dust indirectly

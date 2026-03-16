# Stock Audit Consolidation

Reduce overlap and improve suitability of stock audits for downstream projects.

## Context

The stock audit suite (`lib/audits/stock-audits.ts`) has grown to 33 audits. A review identified several that overlap significantly, a few that are too generic to produce actionable results, and some that lack applicability guards for projects that haven't fully adopted dust's artifact system.

## Changes

### 1. Remove `performance-review`

The `performance-review` audit covers startup time, command latency, memory usage, build performance, and test speed — all of which are covered more precisely by dedicated audits:

- `feedback-loop-speed` — measures check/test execution times with structured output
- `slow-tests` — deep dives into individual test timing with root cause analysis
- `algorithms` — identifies algorithmic complexity bottlenecks
- `data-access-review` — covers data access performance patterns

The generic audit adds breadth but no depth. Downstream projects running both `performance-review` and these specialized audits get redundant, lower-quality findings from the generic one.

**Action:** Delete the `performanceReview` function and remove `'performance-review'` from `stockAuditFunctions`.

### 2. Remove `test-coverage`

The `test-coverage` audit ("identify untested code paths") is too generic to produce consistent results without running actual coverage tools. Its scope is better covered by:

- `test-pyramid` — structured analysis of test distribution by type and timing
- `coverage-exclusions` — reviews coverage configuration for removal opportunities

**Action:** Delete the `testCoverage` function and remove `'test-coverage'` from `stockAuditFunctions`.

### 3. Merge `ideas-from-commits` into `refactoring-opportunities`

Both audits scan `git log` looking for improvement signals:

- `ideas-from-commits` looks for tech debt, TODOs, partial implementations, test gaps
- `refactoring-opportunities` looks for file churn, size growth, concerning commit message patterns

The commit message pattern analysis overlaps directly (both look for "fix", "workaround", "temporary", "hack", "TODO"). Merging them into a single audit that scans commits once and produces both refactoring and general improvement ideas eliminates the duplication.

**Action:** Expand `refactoring-opportunities` to include the TODO/incomplete work/test gap checks from `ideas-from-commits`. Delete `ideasFromCommits` and remove `'ideas-from-commits'` from `stockAuditFunctions`. Rename to something broader if needed (e.g., `commit-review`).

### 4. Merge `naming-consistency` into `ubiquitous-language`

Both audits address naming/terminology consistency:

- `naming-consistency` focuses narrowly on factory/constructor naming (build*/create*/make*/new*)
- `ubiquitous-language` covers broader terminology drift across code, docs, and UI

The factory naming check is a specific case of terminology consistency. Adding it as a subsection of `ubiquitous-language` keeps all naming concerns in one place.

**Action:** Add a "Factory/Constructor Naming" section to `ubiquitous-language` covering the build*/create*/make*/new* analysis from `naming-consistency`. Delete `namingConsistency` and remove `'naming-consistency'` from `stockAuditFunctions`.

### 5. Scope `security-review` to suggest dedicated tools

The current `security-review` audit asks an agent to manually search for hardcoded secrets, injection vulnerabilities, auth issues, etc. This is too broad for an agent to do reliably and risks false confidence — an agent reporting "no issues found" doesn't mean the code is secure.

Instead, the audit should focus on verifying that dedicated security tools are configured and suggesting ones that aren't:

- `npm audit` / `yarn audit` / `bun audit` — dependency vulnerability scanning
- `gitleaks` or `trufflehog` — secret detection in code and git history
- `semgrep` — pattern-based static analysis for security anti-patterns
- `socket.dev` — supply chain security for npm packages
- `snyk` — comprehensive vulnerability scanning

The audit should check which of these (or equivalents) are configured in CI or as dust checks, and create ideas to add missing ones. It can still do a lightweight scan for obvious issues (e.g., grep for common secret patterns like `sk-`, `AKIA`, hardcoded `password =`), but should frame this as a supplement to proper tooling, not a replacement.

**Action:** Rewrite `securityReview` to focus on security tooling coverage. Keep a lightweight "obvious issues" scan but clearly frame it as non-exhaustive.

### 6. Add applicability guards to dust-artifact audits

These audits reference dust-specific directories that may not exist in newly adopted projects:

- `facts-verification` — `.dust/facts/`
- `stale-ideas` — `.dust/ideas/`
- `ideas-from-principles` — `.dust/principles/`
- `repository-context` — `.dust/repository.md`

Each should include an applicability section: "If `.dust/facts/` does not exist or is empty, document that finding and skip the detailed analysis." This pattern already exists in `data-access-review` and `ux-audit`.

**Action:** Add `## Applicability` sections to `facts-verification`, `stale-ideas`, `ideas-from-principles`, and `repository-context` following the existing pattern.

## Summary of Changes

| Audit | Action |
|-------|--------|
| `performance-review` | Remove (covered by specialized audits) |
| `test-coverage` | Remove (covered by `test-pyramid` + `coverage-exclusions`) |
| `ideas-from-commits` | Merge into `refactoring-opportunities` |
| `naming-consistency` | Merge into `ubiquitous-language` |
| `security-review` | Rewrite to focus on tooling coverage |
| `facts-verification` | Add applicability guard |
| `stale-ideas` | Add applicability guard |
| `ideas-from-principles` | Add applicability guard |
| `repository-context` | Add applicability guard |

Net result: 33 audits → 30 audits, with less overlap and better suitability for downstream projects.

## Open Questions

### Should `commit-review` replace both `ideas-from-commits` and `refactoring-opportunities`, or just absorb `ideas-from-commits`?

#### Option: Rename to `commit-review`

Broader name signals that the audit covers both refactoring signals and general improvement ideas from commits. Clearer intent for downstream users.

#### Option: Keep `refactoring-opportunities` name

Less churn. The expanded scope is still about identifying opportunities from commit history, which the current name covers adequately.

### Should `security-review` remain a stock audit or become documentation-only?

#### Option: Keep as audit with tooling focus

The audit actively checks which security tools are configured and suggests missing ones. Still produces actionable ideas.

#### Option: Replace with a principle or fact

If the audit's value is just "use security tools", that could be a principle rather than a repeatable audit.

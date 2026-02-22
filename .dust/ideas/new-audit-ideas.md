# New Audit Ideas

Proposals for new stock audits that address gaps in the current audit suite, aligned with dust's goal of enabling AI agent flow state.

## Context

The current stock audits (`lib/audits/stock-audits.ts`) cover 15 areas: agent developer experience, component reuse, coverage exclusions, data access, dead code, error handling, facts verification, ideas from commits, ideas from principles, performance, refactoring opportunities, security, stale ideas, test coverage, and ubiquitous language.

Reviewing these against dust's principles and goals reveals several gaps where new audits would provide value.

## Proposed Audits

### ~~Error Handling Audit~~ (Implemented)

Now available as a stock audit: `bin/dust audit error-handling`

### Dependency Health Audit

Review project dependencies for maintenance and security concerns beyond CVE scanning.

**Why this matters:** The security-review audit checks for CVE vulnerabilities, but healthy dependencies require more than security patches. Unmaintained packages, version drift, and unnecessary dependencies all impact project health.

**Scope:**
- Packages with no recent releases (potential abandonment)
- Major version drift from latest (missing features, eventual migration pain)
- Unused dependencies (already covered by dead-code, but dependency-specific checks)
- Deprecated packages still in use
- Packages with better-maintained alternatives

### Documentation Drift Audit

Review code documentation for accuracy against current implementation.

**Why this matters:** The facts-verification audit checks `.dust/facts/`, but code-level documentation (JSDoc, README sections, inline comments) can also drift from reality. Outdated docs mislead agents.

**Scope:**
- JSDoc descriptions that no longer match function behavior
- README code examples that don't compile
- Parameter documentation for removed/renamed parameters
- Return type documentation that contradicts actual types
- Inline comments describing code that has changed

### Feedback Loop Speed Audit

Measure and report on check/test execution times to identify bottlenecks.

**Why this matters:** The [Fast Feedback Loops](../principles/fast-feedback-loops.md) principle emphasizes that agents benefit from quick feedback. The performance-review audit covers general performance, but a focused audit on the development feedback loop would directly address agent productivity.

**Scope:**
- Time to run `dust check` (aggregate and per-check)
- Test suite execution time (total and slowest tests)
- Type checking duration
- Linting duration
- Build time
- Identify checks that dominate total time
- Track trends over time to catch regression

### Agent Instruction Quality Audit

Review agent instruction files (AGENTS.md, CLAUDE.md) for clarity and completeness.

**Why this matters:** Agent instruction files directly impact agent effectiveness. Poor instructions lead to wasted context, confusion, and suboptimal decisions. This complements the agent-developer-experience audit with a focus on the instruction artifacts themselves.

**Scope:**
- Contradictory instructions across files
- Instructions that reference removed code/features
- Missing context that agents frequently need
- Overly verbose instructions wasting context window
- Instructions that could be replaced by linter rules

### Commit Message Quality Audit

Review recent commits for message quality and traceability.

**Why this matters:** The [Traceable Decisions](../principles/traceable-decisions.md) principle emphasizes that commit history should explain why changes were made. The ideas-from-commits audit looks for improvement opportunities, but doesn't evaluate message quality itself.

**Scope:**
- Commits with generic messages ("fix", "update", "WIP")
- Commits lacking "why" context
- Breaking commits without explanation of impact
- Multi-concern commits that should have been split
- Commits missing links to related issues/tasks

## Open Questions

### Should all proposed audits be added, or a subset?

#### Option: Add all six audits

Comprehensive coverage of identified gaps. Users can choose which to run.

#### Option: Start with highest-value subset

Prioritize audits that most directly support agent autonomy (error handling, feedback loop speed, agent instruction quality). Add others later.

### How specific should feedback loop speed thresholds be?

#### Option: No thresholds, just report times

Let users interpret the numbers. Different projects have different acceptable speeds.

#### Option: Configurable thresholds with defaults

Provide sensible defaults (e.g., "total check time > 60s triggers warning") that users can customize.

#### Option: Trend-based warnings

Flag slowdowns relative to historical measurements rather than absolute thresholds.

### Should the error handling audit overlap with security-review?

#### Option: Keep separate with distinct focus (Selected)

Error handling audit focuses on agent-friendliness and consistency. Security audit focuses on vulnerabilities. Minimal overlap. This option was selected when implementing the error-handling stock audit.

#### Option: Merge error handling into security

Error handling issues can have security implications (e.g., swallowed auth errors). Combine into broader audit.

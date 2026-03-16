# Implement Dependency Health Audit

Add a `dependency-health` stock audit that reviews project dependencies for maintenance and security concerns beyond CVE scanning.

## Context

The security-review audit checks for CVE vulnerabilities, but healthy dependencies require more than security patches. Unmaintained packages, version drift, and deprecated packages all impact project health and can introduce agent confusion when outdated documentation or APIs don't match reality.

## Requirements

### Analysis Scope

1. **Packages with no recent releases** - Identify dependencies that haven't been updated in 2+ years (potential abandonment)
2. **Major version drift** - Find dependencies more than 2 major versions behind latest (missing features, eventual migration pain)
3. **Deprecated packages** - Detect packages marked as deprecated on npm
4. **Better-maintained alternatives** - Flag packages with known successors (e.g., `request` → `node-fetch` or `got`)

### Output

For each concern found, the audit should guide agents to document:
- Package name and current version
- Type of concern (unmaintained, outdated, deprecated, superseded)
- Suggested action (update, replace, remove, or accept risk with rationale)

### Stock Audit Registration

Register `dependency-health` in `lib/audits/stock-audits.ts` following the existing pattern.

## Principles

- [Minimal Dependencies](../principles/minimal-dependencies.md) - Avoid coupling to specific tools; healthy dependencies are easier to swap
- [Maintainable Codebase](../principles/maintainable-codebase.md) - Maintained dependencies reduce maintenance burden
- [Agent Autonomy](../principles/agent-autonomy.md) - Agents benefit from up-to-date dependencies with accurate documentation

## Blocked By

(none)

## Definition of Done

- [ ] `dependency-health` stock audit template added to `lib/audits/stock-audits.ts`
- [ ] Audit registered in `stockAuditFunctions` map
- [ ] Template includes instructions for checking package release dates
- [ ] Template includes instructions for identifying major version drift
- [ ] Template includes instructions for detecting deprecated packages
- [ ] Template includes guidance for finding better-maintained alternatives
- [ ] Template includes Principles section linking to relevant principles
- [ ] `bin/dust check` passes
- [ ] `bin/dust audit` lists the new audit

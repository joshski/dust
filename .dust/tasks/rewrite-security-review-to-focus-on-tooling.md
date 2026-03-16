# Rewrite security-review to Focus on Tooling

Refocus the `security-review` audit to verify security tooling configuration rather than attempting manual vulnerability scanning.

## Context

The current `security-review` audit asks an agent to manually search for hardcoded secrets, injection vulnerabilities, auth issues, etc. This is too broad for an agent to do reliably and risks false confidence — an agent reporting "no issues found" doesn't mean the code is secure.

Instead, the audit should focus on verifying that dedicated security tools are configured and suggesting ones that aren't:

- `npm audit` / `yarn audit` / `bun audit` — dependency vulnerability scanning
- `gitleaks` or `trufflehog` — secret detection in code and git history
- `semgrep` — pattern-based static analysis for security anti-patterns
- `socket.dev` — supply chain security for npm packages
- `snyk` — comprehensive vulnerability scanning

The audit should check which of these (or equivalents) are configured in CI or as dust checks, and create ideas to add missing ones. It can still do a lightweight scan for obvious issues (e.g., grep for common secret patterns like `sk-`, `AKIA`, hardcoded `password =`), but should frame this as a supplement to proper tooling, not a replacement.

## Changes

1. Rewrite `securityReview` to focus on security tooling coverage
2. Add sections for checking CI configuration and dust checks for security tools
3. Include a lightweight "obvious issues" scan clearly framed as non-exhaustive
4. Update the Definition of Done to reflect tooling verification

## Principles

- [Lint Everything](../principles/lint-everything.md) — Security checks should use dedicated static analysis tools
- [Batteries Included](../principles/batteries-included.md) — The audit should suggest appropriate security tooling

## Blocked By

(none)

## Definition of Done

- [ ] `securityReview` focuses on verifying security tool configuration
- [ ] Audit checks for common security tools in CI and dust checks
- [ ] Lightweight pattern scan is framed as supplementary to proper tooling
- [ ] `bin/dust check` passes

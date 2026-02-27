# Dependency Security Scanning

Add automated dependency vulnerability scanning to the development workflow.

## Current State

The project has minimal dependencies (all devDependencies). However, there's no automated mechanism to detect known vulnerabilities in transitive dependencies.

A security review (2026-02-27) identified one high-severity vulnerability:
- `rollup` 4.0.0-4.58.0 has arbitrary file write via path traversal (GHSA-mw96-cpmx-2vgc)
- This is a transitive dev dependency via vitest → vite → rollup
- Fix available by updating to rollup 4.59.0+

## Possible Approaches

### Add npm audit to CI
Run `npm audit` or equivalent in CI to catch vulnerabilities before merge. Requires generating a package-lock.json since the project uses bun.

### Use Bun's security scanner
Configure a security scanner in `bunfig.toml` once Bun supports it natively or via plugin.

### Scheduled dependency updates
Periodically run dependency updates (e.g., via Renovate or Dependabot) to stay current with security patches.

## Open Questions

### How should vulnerability severity be handled?

#### Fail CI on high/critical only
Only block on high and critical vulnerabilities. Low and moderate issues are logged but don't fail the build.

#### Fail CI on any vulnerability
Strict policy - any known vulnerability fails CI. May require more maintenance.

#### Advisory only
Report vulnerabilities but don't fail CI. Leaves remediation as a manual decision.

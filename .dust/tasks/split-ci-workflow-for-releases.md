# Split CI workflow for releases

GitHub PRs currently show "1 skipped, 1 successful checks" which is confusing. This happens because the `publish` job in `.github/workflows/ci.yml` has an `if: github.event_name == 'release'` condition, but GitHub still reports skipped jobs in the checks count.

## Technical approach

1. Remove the `publish` job and `release` trigger from `.github/workflows/ci.yml`
2. Create a new `.github/workflows/release.yml` that:
   - Triggers only on `release: types: [published]`
   - Contains the publish job with quality checks and build steps
   - Has the same permissions (`contents: read`, `id-token: write`)

This way PRs will only see the single "Quality Gate" check, and releases will trigger the separate release workflow.

## Files

- `.github/workflows/ci.yml` - remove publish job and release trigger
- `.github/workflows/release.yml` - new file for release publishing

## Goals

(none)

## Blocked by

(none)

## Definition of done

- [ ] `.github/workflows/ci.yml` only triggers on push and pull_request, with just the check job
- [ ] `.github/workflows/release.yml` exists and triggers on release events
- [ ] Release workflow runs quality checks before publishing
- [ ] PRs show only 1 check (no skipped checks)

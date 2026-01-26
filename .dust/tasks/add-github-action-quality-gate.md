# Add GitHub Action Quality Gate

Create a GitHub Action workflow that runs quality checks on pull requests.

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Fast Feedback](../goals/fast-feedback.md)
- [Repository Hygiene](../goals/repository-hygiene.md)

## Blocked by

(none)

## Definition of done

- `.github/workflows/ci.yml` (or similar) exists
- Workflow triggers on pull requests to main branch
- Workflow runs `dust check` (or equivalent quality gates)
- Workflow status is visible on PRs
- Failed checks block PR merging (via branch protection, documented as recommended setup)

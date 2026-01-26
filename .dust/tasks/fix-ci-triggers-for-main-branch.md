# Fix CI Triggers for Main Branch

The CI workflow only runs on pull requests, not on pushes to main. This means checks don't run after PRs are merged or on direct pushes to main.

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Fast Feedback](../goals/fast-feedback.md)
- [Repository Hygiene](../goals/repository-hygiene.md)

## Blocked by

(none)

## Problem

Current `.github/workflows/ci.yml` only has:

```yaml
on:
  pull_request:
    branches: [main]
```

Missing `push` trigger means:
- No checks run when PRs are merged to main
- No checks run on direct pushes to main
- No visibility into main branch health

## Definition of done

- Workflow triggers on both `pull_request` and `push` to main branch
- Checks run after PRs are merged
- Main branch status badge could be added to README (optional)

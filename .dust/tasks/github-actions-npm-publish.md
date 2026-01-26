# GitHub Actions workflow for npm publishing

Implement a GitHub Actions workflow to build and publish the npm package automatically.

## Goals

- [Fast Feedback](../goals/fast-feedback.md)
- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Easy Adoption](../goals/easy-adoption.md)

## Blocked by

(none)

## Definition of done

- [ ] GitHub Actions workflow file created (e.g., `.github/workflows/publish.yml`)
- [ ] Workflow builds the package on push/PR
- [ ] Workflow publishes to npm on release (with appropriate triggers)
- [ ] `.dust/hooks/check` step 2 simplified to just verify the build succeeds (remove hash comparison)
- [ ] `bin/dust check` passes

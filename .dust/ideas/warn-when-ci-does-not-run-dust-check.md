# Warn When CI Does Not Run dust check

Detect when a repository has CI workflows (like GitHub Actions) but none of them run `dust check`, and surface this as a warning.

## Context

The `dust check` command runs the quality gate checks configured in `.dust/config/settings.json`. For dust to be effective, this check should run both locally and in CI. When CI doesn't run `dust check`, there's no safety net catching issues that slip past local development.

Currently, dust has no way to know whether CI is configured to run its checks. A repository could adopt dust locally but never integrate it into CI, leaving a gap in the feedback loop.

The [Stop the Line](../principles/stop-the-line.md) principle states that problems should be caught at their source. If CI doesn't run `dust check`, failing checks on one developer's machine might not block merging, allowing defects to propagate.

## Detection Approach

The warning could be triggered by:

1. Detecting CI workflow files (e.g., `.github/workflows/*.yml`)
2. Searching those files for references to `dust check`
3. Warning if workflows exist but none reference `dust check`

This would be a lint check, similar to how `dust lint` validates `.dust/` markdown files. It could be part of an expanded `dust lint` or a dedicated CI validation.

## Related Code

- `.github/workflows/ci.yml:27` - This repo's CI runs `./bin/dust check --serial`
- `lib/cli/commands/lint.ts` - The `dust lint` command implementation
- `lib/cli/commands/check.ts` - The `dust check` command implementation
- `lib/config/settings.ts` - Settings loading including check configuration

## Potential Warning Triggers

- CI workflow files exist but don't mention `dust check`, `dust check`, or the dust executable
- CI workflow files reference other checks (npm test, lint) but not dust
- CI workflow files exist and the repository has a `.dust/` directory (indicating dust adoption)

## Considerations

### False Positives

Some repositories may intentionally not run `dust check` in CI:
- Repositories using dust only for documentation workflows
- Repositories where checks are delegated to a different CI system
- Monorepos where only certain projects use dust

The warning should be suppressible via configuration.

### Alternative CI Systems

GitHub Actions is one of many CI providers. A complete solution would need patterns for:
- GitHub Actions (`.github/workflows/*.yml`)
- GitLab CI (`.gitlab-ci.yml`)
- CircleCI (`.circleci/config.yml`)
- Azure Pipelines (`azure-pipelines.yml`)
- Jenkins (`Jenkinsfile`)
- Travis CI (`.travis.yml`)

### Indirect References

CI might run `dust check` indirectly:
- Via `npm run check` that calls `dust check`
- Via a script that calls dust
- Via a Docker image that includes dust

Detecting these indirect references is complex. The simplest approach warns only when there's no direct reference to `dust` in CI files, accepting some false positives.

## Principle Alignment

- [Stop the Line](../principles/stop-the-line.md) - CI ensures problems are caught before merging
- [Fast Feedback Loops](../principles/fast-feedback-loops.md) - CI provides feedback on all branches and PRs
- [Lint Everything](../principles/lint-everything.md) - This would be a structural lint for CI configuration
- [Actionable Errors](../principles/actionable-errors.md) - The warning should explain how to add dust check to CI

## Open Questions

### Where should this check live?

#### Option: Part of `dust lint`

Add CI validation as a built-in lint alongside markdown validation. Runs automatically when `dust lint` is invoked. Consistent with the "lint everything" philosophy.

#### Option: Separate `dust ci` or `dust validate-ci` command

Keep CI validation separate from markdown linting. Users opt-in explicitly. Clearer intent but adds another command.

#### Option: Part of `dust audit`

Treat missing CI integration as an audit finding rather than a lint error. Appropriate since it's more of a best-practice recommendation than a hard requirement.

### Should this be an error or a warning?

#### Option: Warning only

Display a warning but don't fail the check. Missing CI integration is a recommendation, not a requirement. Avoids blocking users who intentionally don't use CI.

#### Option: Error by default, suppressible

Treat as an error that fails `dust lint`. Users can suppress via configuration. Enforces the best practice more strongly.

#### Option: Configurable severity

Allow users to configure whether this is an error, warning, or disabled. Maximum flexibility but adds configuration complexity.

### How should the fix guidance be presented?

#### Option: Show example workflow snippet

Include a ready-to-paste GitHub Actions workflow snippet that runs `dust check`. Users can copy directly into their repo.

#### Option: Link to documentation

Point to dust documentation about CI integration. Keeps the message short and the docs comprehensive.

#### Option: Generate workflow file via `dust init-ci`

Offer a command that generates a CI workflow file. Most helpful but adds implementation scope.

# npm Publishing

Dust is published to npm automatically via GitHub Actions when a release is created.

## How It Works

1. Create a GitHub release (via the Releases page or `gh release create`)
2. The CI workflow runs quality checks first
3. If checks pass, the publish job runs `npm publish --access public`
4. Authentication uses OIDC trusted publishing (no tokens required)

## Trusted Publishing

This package uses [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) with OpenID Connect (OIDC). This eliminates the need for long-lived npm tokens. The GitHub Actions workflow authenticates directly with npm using short-lived, workflow-specific credentials.

The trusted publisher is configured on npmjs.com to accept publishes from:
- **Repository:** `joshski/dust`
- **Workflow:** `ci.yml`

## Version Numbering

Update the version in `package.json` before creating a release. Follow [semantic versioning](https://semver.org/):

- **Patch** (0.0.X): Bug fixes, no API changes
- **Minor** (0.X.0): New features, backwards compatible
- **Major** (X.0.0): Breaking changes

Example workflow:
```bash
# Update version in package.json
bun run build
git add package.json
git commit -m "Bump version to 1.2.3"
git push
gh release create v1.2.3 --title "v1.2.3" --notes "Release notes here"
```

## Requirements

The trusted publisher must be configured on npmjs.com under the package settings. No GitHub secrets are required for publishing.

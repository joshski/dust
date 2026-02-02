# Add npm smoke test

Add a post-release smoke test job to the GitHub Actions release workflow that verifies the published package can be installed and responds to help requests.

## Context

The release workflow (`.github/workflows/release.yml`) currently publishes to npm but doesn't verify that the published package actually works. A smoke test would catch issues like:
- Missing files in the published package
- Broken shebang or entry point
- Missing dependencies

## Implementation

Add a new job to `.github/workflows/release.yml` that:

1. **Depends on the publish job** using `needs: publish`
2. **Waits for npm propagation** - add a delay (~30-60 seconds) since npm registry updates aren't instant
3. **Creates a temporary directory** and installs the package fresh:
   ```bash
   npm install @joshski/dust@${{ github.event.release.tag_name }}
   ```
4. **Runs the help command** and verifies it outputs expected content:
   ```bash
   npx @joshski/dust help
   ```
5. **Validates the output** contains expected text like "dust" and "Usage:"

The smoke test should use a clean environment (fresh ubuntu runner) to simulate a real user installation.

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- [ ] New `smoke-test` job added to `.github/workflows/release.yml`
- [ ] Job depends on `publish` job completing successfully
- [ ] Job installs the package using the release tag version
- [ ] Job runs `dust help` and verifies output contains expected text
- [ ] Job fails if installation or help command fails

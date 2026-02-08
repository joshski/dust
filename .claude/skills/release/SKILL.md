---
name: release
description: Release a new version of dust
disable-model-invocation: true
---

## Release Workflow

Release a new version of dust by following these steps exactly:

### 1. Pull and check

```
git pull
bin/dust check
```

All checks must pass before proceeding. If any fail, stop and fix them first.

### 2. Determine the new version

- Read the current version from `package.json`
- Check recent releases: `gh release list --limit 5`
- Check commits since the last release tag: `git log <last-tag>..HEAD --oneline`
- Bump the patch version (e.g. 0.1.24 -> 0.1.25)

### 3. Update package.json

Edit the `"version"` field in `package.json` to the new version.

### 4. Commit, push, and release

- Commit: `git commit -m "Bump version to X.Y.Z"`
- Push: `git push`
- Create a GitHub release with notes summarizing the commits since the last tag:
  ```
  gh release create vX.Y.Z --title "vX.Y.Z" --notes "<release notes>"
  ```

The release notes should be a `## What's Changed` section with a bullet per meaningful change. Only include changes that impact downstream consumers (e.g. new features, bug fixes, API changes). Skip internal-only changes like task management commits ("Add task:", "Shelve Idea:"), refactors with no external effect, and documentation updates.

### 5. Report

Print the release URL and a summary of what was released.

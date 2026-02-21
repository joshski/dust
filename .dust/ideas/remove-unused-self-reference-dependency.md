# Remove Unused Self-Reference Dependency

The `@joshski/dust` dependency in package.json is a self-reference that was added in commit 1061ccd but is never imported anywhere in the codebase.

## Issue

The package.json contains:
```json
"dependencies": {
  "@joshski/dust": "^0.1.49"
}
```

This self-reference is unusual and appears to be dead code. Running `grep -r "from '@joshski/dust'" --include="*.ts" .` returns no results.

## Proposed Fix

Remove the `dependencies` section from package.json entirely since the self-reference is the only dependency.

## Verification

Before removing, verify that:
1. No dynamic imports reference `@joshski/dust`
2. The package was not added intentionally for a specific use case (e.g., testing published versions)

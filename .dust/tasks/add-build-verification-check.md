# Add Build Verification Check

Add a build verification step to the check hook that ensures `dist/dust.js` is current with source code.

## Problem

After implementing the build step, there's no mechanism to verify the build output matches the current source. Someone could modify TypeScript files and forget to rebuild, leaving stale JavaScript in `dist/`.

## Solution

Use a build-and-diff approach in the check hook:

1. Run the build command
2. Check for uncommitted changes in `dist/`
3. Fail if the build output differs from what's committed

This treats git as the source of truth — if the committed build doesn't match what the build produces from current source, the check fails.

## Goals

- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- Check hook runs `bun build` and verifies no uncommitted changes in `dist/`
- Build verification happens before tests (fail fast on stale builds)
- Clear error message when build is out of sync with source
- Add `build` script to package.json for convenience

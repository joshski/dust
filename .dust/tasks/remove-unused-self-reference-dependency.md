# Remove Unused Self-Reference Dependency

Remove the `@joshski/dust` self-reference from package.json's dependencies section.

The package.json currently contains a self-reference to `@joshski/dust` that was added in commit 1061ccd but is never imported anywhere in the codebase. This creates unnecessary noise and may cause confusion for contributors or tools analyzing the dependency graph.

## Changes Required

1. Remove the `dependencies` section from package.json (since `@joshski/dust` is the only dependency)
2. Run `bun install` to update the lockfile

## Verification

Before removing, verify that:
- No TypeScript files import from `@joshski/dust` (only doc comments reference it as examples for downstream consumers)
- No dynamic imports reference the package

## Principles

- [Minimal Dependencies](../principles/minimal-dependencies.md)
- [Repository Hygiene](../principles/repository-hygiene.md)

## Blocked By

(none)

## Definition of Done

- [ ] The `dependencies` section is removed from package.json
- [ ] `bun.lock` is updated to reflect the removal
- [ ] `bin/dust check` passes

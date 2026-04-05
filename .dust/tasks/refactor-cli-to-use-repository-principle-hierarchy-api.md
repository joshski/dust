# Refactor CLI to use repository principle hierarchy API

Replace the CLI's internal `buildPrincipleHierarchy()` function with the new public `getRepositoryPrincipleHierarchy()` API. This validates that the API meets internal needs, reduces code duplication, and ensures consistency between CLI and library behavior.

## Principles

- [Reasonably DRY](../principles/reasonably-dry.md)
- [Decoupled Code](../principles/decoupled-code.md)
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md)

## Guidance

### Reasonably DRY

Don't repeat yourself is a good principle, but don't overdo it.

Duplication is cheaper than the wrong abstraction. Sometimes repeating code is clearer than forcing it into a shared utility. When logic diverges over time, duplicated code can evolve independently without breaking other use cases.

The goal is to eliminate harmful duplication—where a bug fix or feature must be applied in multiple places. Duplication of structure without duplication of intent is acceptable. Premature abstraction creates coupling and increases cognitive load.

Use your judgment: if two pieces of code serve different purposes despite looking similar, leave them separate. If they truly represent the same concept and will evolve together, share them.

### Decoupled Code

Code should be organized into independent units with explicit dependencies.

Decoupled code is easier to test, understand, and modify. Dependencies are passed in rather than hard-coded, enabling units to be tested in isolation and composed flexibly. This reduces the blast radius of changes and makes the system more maintainable.

### Make Changes with Confidence

Developers should be able to modify code without fear of breaking existing behavior.

A comprehensive test suite and reproducible checks create confidence. When tests cover critical paths and edge cases, developers can refactor and improve code knowing that regressions will be caught immediately.

This confidence is essential for agent-driven development. Agents cannot verify their changes through manual testing—they depend entirely on automated checks. A project with good test coverage allows agents to work autonomously; without it, every change becomes risky.

## Definition of Done

- File `lib/cli/commands/list.ts` no longer contains `buildPrincipleHierarchy()` function
- CLI imports and uses `getRepositoryPrincipleHierarchy()` from `@joshski/dust/artifacts`
- CLI converts `RepositoryPrincipleNode[]` to required format for rendering (if needed)
- `dust principles --tree` command output remains unchanged
- All existing CLI tests pass (`bin/dust check`)
- No regression in CLI behavior

## Implementation Notes

The CLI currently uses `buildPrincipleHierarchy()` which returns `PrincipleNode[]` with `{ filePath, title, children }` structure. The new API returns `RepositoryPrincipleNode[]` with `{ slug, title, children }` structure.

You may need to:
- Convert slugs to file paths for rendering (using `${slug}.md`)
- Or update rendering logic to work with slugs directly
- Check if any code depends on the `filePath` field

The CLI rendering code is in `lib/cli/commands/list.ts` around lines 448-463 where it renders core and local principles separately.

## Blocked By

(none)

## Decomposes Idea

(idea has been fully decomposed and deleted)

## Task Type

implement

## Repository Hints

The CLI's `buildPrincipleHierarchy()` is at `lib/cli/commands/list.ts:179-231`. Check whether file paths are actually needed for rendering or if slugs are sufficient.

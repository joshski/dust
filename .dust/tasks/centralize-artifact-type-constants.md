# Centralize Artifact Type Constants

Export `ARTIFACT_TYPES` from `lib/artifacts/index.ts` and import it in all locations that define redundant arrays of artifact directory names.

## Context

The artifact directory names (`ideas`, `tasks`, `principles`, `facts`) are defined independently in six locations with inconsistent ordering. The `ArtifactType` union in `lib/artifacts/index.ts` is the canonical domain type, but it is not reused where string arrays are needed.

Current locations:
- `lib/artifacts/index.ts:92` — `ARTIFACT_TYPES` (module-private)
- `lib/validation/validation-pipeline.ts:61` — `CONTENT_DIRS`
- `lib/patch/index.ts:55` — `CONTENT_DIRS`
- `lib/cli/commands/init.ts:16` — `DUST_DIRECTORIES`
- `lib/lint/validators/directory-validator.ts:8` — `EXPECTED_DIRECTORIES`
- `lib/cli/commands/list.ts:45` — `VALID_TYPES`

## Implementation

1. Export the existing `ARTIFACT_TYPES` constant from `lib/artifacts/index.ts`, changing the order to alphabetical: `['facts', 'ideas', 'principles', 'tasks']`

2. Update each consumer module:
   - `lib/validation/validation-pipeline.ts` — import `ARTIFACT_TYPES` and remove local `CONTENT_DIRS`
   - `lib/patch/index.ts` — import `ARTIFACT_TYPES` and remove local `CONTENT_DIRS`
   - `lib/cli/commands/list.ts` — import `ARTIFACT_TYPES` and remove local `VALID_TYPES`
   - `lib/cli/commands/init.ts` — derive `DUST_DIRECTORIES` from `ARTIFACT_TYPES` plus `'config'`
   - `lib/lint/validators/directory-validator.ts` — derive `EXPECTED_DIRECTORIES` from `ARTIFACT_TYPES` plus `'config'`

3. Update the `ValidationContext.byType` object to use alphabetical key ordering for consistency

## Principles

- [Reasonably DRY](../principles/reasonably-dry.md)
- [Naming Matters](../principles/naming-matters.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Blocked By

(none)

## Definition of Done

- `ARTIFACT_TYPES` is exported from `lib/artifacts/index.ts` with alphabetical ordering
- All six locations use the single canonical constant (directly or derived)
- No duplicate array definitions of artifact directory names remain
- `bin/dust check` passes

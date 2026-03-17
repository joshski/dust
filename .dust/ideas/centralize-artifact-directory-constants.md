# Centralize artifact directory constants

Consolidate the four redundant definitions of content directory arrays into a single canonical source in `lib/artifacts/index.ts`.

## Problem

The artifact directory names (`ideas`, `tasks`, `principles`, `facts`) are defined independently in four locations with inconsistent ordering and semantic groupings:

| Location | Definition | Order |
|----------|------------|-------|
| `lib/artifacts/index.ts:92` | `ARTIFACT_TYPES` | ideas, tasks, principles, facts |
| `lib/validation/validation-pipeline.ts:61` | `CONTENT_DIRS` | principles, facts, ideas, tasks |
| `lib/patch/index.ts:55` | `CONTENT_DIRS` | principles, facts, ideas, tasks |
| `lib/cli/commands/init.ts:16` | `DUST_DIRECTORIES` | principles, ideas, tasks, facts, **config** |
| `lib/lint/validators/directory-validator.ts:8` | `EXPECTED_DIRECTORIES` | principles, ideas, tasks, facts, **config** |
| `lib/cli/commands/list.ts:45` | `VALID_TYPES` | tasks, ideas, principles, facts |

The `ArtifactType` union in `lib/artifacts/index.ts` is the canonical domain type, but it is not reused where string arrays are needed.

## Proposed Solution

Export a canonical `ARTIFACT_TYPES` constant alongside the existing `ArtifactType` union from `lib/artifacts/index.ts`, then import it in the other modules.

For locations that include `config` (init and directory-validator), derive the extended array:
```typescript
const DUST_DIRECTORIES = [...ARTIFACT_TYPES, 'config'] as const
```

## Locations

- `lib/artifacts/index.ts:92` - Canonical source (already exports `ArtifactType`)
- `lib/validation/validation-pipeline.ts:61` - Replace local `CONTENT_DIRS` with import
- `lib/patch/index.ts:55` - Replace local `CONTENT_DIRS` with import
- `lib/cli/commands/init.ts:16` - Derive from `ARTIFACT_TYPES` plus 'config'
- `lib/lint/validators/directory-validator.ts:8` - Derive from `ARTIFACT_TYPES` plus 'config'
- `lib/cli/commands/list.ts:45` - Replace local `VALID_TYPES` with import

## Incremental Migration Path

1. Export `ARTIFACT_TYPES` from `lib/artifacts/index.ts` (currently module-private)
2. Update `lib/validation/validation-pipeline.ts` to import and use `ARTIFACT_TYPES`
3. Update `lib/patch/index.ts` to import and use `ARTIFACT_TYPES`
4. Update `lib/cli/commands/list.ts` to import and use `ARTIFACT_TYPES`
5. Update `lib/cli/commands/init.ts` to derive `DUST_DIRECTORIES` from `ARTIFACT_TYPES`
6. Update `lib/lint/validators/directory-validator.ts` to derive `EXPECTED_DIRECTORIES` from `ARTIFACT_TYPES`
7. Run `bin/dust check` to verify no regressions

## Principles

- [Naming Matters](../principles/naming-matters.md)
- [Reasonably DRY](../principles/reasonably-dry.md)

## Open Questions

### Should order be standardized across all modules?

#### Option: Preserve existing order per module

Each import site continues to sort as needed for its context. The different modules currently use different orderings; standardizing would make diffs cleaner but may cause subtle ordering changes in output or iteration. Preserving order is a safer migration but doesn't fully centralize.

#### Option: Standardize alphabetical order

Use `['facts', 'ideas', 'principles', 'tasks']` everywhere. Simple rule to follow but may change existing output order in some commands.

#### Option: Standardize by artifact lifecycle

Use `['principles', 'facts', 'ideas', 'tasks']` (guiding to current to future to work). Semantically meaningful ordering but the semantic grouping is somewhat arbitrary.

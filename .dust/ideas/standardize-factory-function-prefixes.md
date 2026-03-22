# Standardize Factory Function Prefixes

Factory functions in the codebase use `build*` and `create*` prefixes inconsistently, making it unclear when to use which convention.

## Current State

The codebase has two dominant patterns for factory/constructor functions:

| Pattern | Count | Typical Use |
|---------|-------|-------------|
| `create*` | ~50+ | Service objects, runners, emulators, state objects |
| `build*` | ~20+ | Data structures, messages, payloads, repositories |

## Analysis

Most of the codebase follows an implicit convention:

**`create*` functions** construct service/runner objects from dependency injection:
- `createShellRunner(spawnFn)` - wraps spawn function
- `createFileSystem(primitives)` - wraps filesystem primitives
- `createLoggingService(options)` - creates service interface
- `createDefaultDependencies()` - returns dependency bundles

**`build*` functions** construct data structures, messages, or payloads:
- `buildTaskPrompt()` - constructs a string
- `buildTokenResponse()` - constructs a response object
- `buildEventMessage(parameters)` - constructs message data
- `buildConnectionInitPayload()` - constructs payload data

## Inconsistencies

Three high-profile functions violate this pattern:

| Function | File | Issue |
|----------|------|-------|
| `buildArtifactsRepository()` | `lib/artifacts/index.ts:291` | Constructs a repository interface (should be `create*`) |
| `buildReadOnlyArtifactsRepository()` | `lib/artifacts/index.ts:364` | Constructs a repository interface (should be `create*`) |
| `buildAuditsRepository()` | `lib/audits/index.ts:75` | Constructs a repository interface (should be `create*`) |

These repository functions take dependencies and return service interfaces, which matches the `create*` pattern used elsewhere (e.g., `createFileSystem`, `createLoggingService`).

## Recommendation

Rename the three repository factory functions to use `create*`:
- `buildArtifactsRepository()` -> `createArtifactsRepository()`
- `buildReadOnlyArtifactsRepository()` -> `createReadOnlyArtifactsRepository()`
- `buildAuditsRepository()` -> `createAuditsRepository()`

Document the distinction in code comments or a fact file:
- `create*` - Factory functions that construct service objects, runners, or interfaces from dependencies
- `build*` - Functions that construct data values, messages, or payloads from parameters

## Migration

Use incremental migration with aliases:
1. Add new `create*` names as aliases
2. Update all internal callers
3. Mark `build*` names as deprecated
4. Remove aliases after one release cycle

## Scope

This is a moderate refactoring affecting:
- `lib/artifacts/index.ts` (2 functions, used widely)
- `lib/audits/index.ts` (1 function)
- Package exports in `@joshski/dust/artifacts` and `@joshski/dust/audits`
- All code that imports these functions

# Fix 5 coverage exclusions

Find and remove 5 unnecessary `v8 ignore` directives by writing unit tests that exercise the excluded code paths.

## Context

The codebase uses `/* v8 ignore */` comments to exclude code paths from coverage metrics. Some exclusions are legitimate (thin wrappers around native functions that cannot be unit tested), but others may be testable with proper test setup. Reducing exclusions improves the signal from coverage metrics and aligns with the [Unit Test Coverage](../principles/unit-test-coverage.md) principle.

## Current State

The codebase has 28 v8 ignore regions across 8 files. Categories:

### Thin wrappers (legitimate exclusions)

Functions that only wrap native APIs with no logic to test:
- `lib/bucket/auth-server.ts:4-50` - `createLocalServer()` wraps `http.createServer`, `openBrowser()` wraps `spawn`
- `lib/cli/commands/bucket.ts:95-176` - Six wrappers: `defaultCreateWebSocket`, `defaultSetupKeypress`, `defaultSetupSignals`, `defaultSetupResize`, `defaultGetTerminalSize`, `defaultWriteStdout`
- `lib/cli/commands/bucket.ts:236-269` - `createDefaultBucketDependencies()` assembles default implementations
- `lib/cli/commands/bucket-asset-upload.ts:73-141` - `createDefaultUploadDependencies()` wires up fs/fetch
- `lib/bucket/repository.ts:120-132` - `createDefaultRepositoryDependencies()` wires up spawn/run/sleep

### Defensive error handlers

Code that catches unexpected exceptions:
- `lib/bucket/repository.ts:101-110` - `.catch()` on the loop promise
- `lib/bucket/repository-loop.ts:272-288` - `catch` block around `runOneIteration`

These handlers fire when something unexpected fails. Testing would require injecting a failure into `runOneIteration`, which is feasible by stubbing dependencies.

### Callback internals not tracked by v8

Anonymous callback bodies that v8 fails to track:
- `lib/bucket/repository-loop.ts:149-157` - Object literal with callback properties
- `lib/bucket/repository-loop.ts:178-186` - `line` callback in createStdoutSink
- `lib/bucket/repository-loop.ts:224-238` - `sendEvent` call inside async callback
- `lib/bucket/repository-loop.ts:301-305` - Promise constructor callback
- `lib/cli/commands/bucket.ts:653-676` - `handleRepositoryListFromRepo` promise chain

The file-level exclusions in `vitest.config.ts` for `repository-loop.ts` and `bucket.ts` exist because v8 doesn't honor inline ignores for function-level metrics. These cannot be fixed without v8 changes.

### Unreachable code paths

Code that is mathematically unreachable but retained for defensive completeness:
- `lib/bucket/terminal-ui.ts:130-132` - `return result` after loop; the `visibleLength` guard on line 91 ensures truncation always occurs inside the loop
- `lib/bucket/terminal-ui.ts:366-368` - Fallback color when repo missing from color map; impossible because both are built from the same array

These could potentially be removed entirely rather than tested.

### Guard clauses for filesystem edge cases

- `lib/validation/index.ts:185-187` - Filters non-.md files from `readdir` results

This is testable by creating a test filesystem with a non-.md file in the principles directory.

## Candidate Exclusions to Fix

Based on feasibility and value:

1. **`lib/validation/index.ts:185-187`** - Create a test with non-.md files in principles directory
2. **`lib/bucket/repository.ts:101-110`** - Inject a failing `runRepositoryLoop` mock
3. **`lib/bucket/repository-loop.ts:272-288`** - Inject a failing `runOneIteration` mock
4. **`lib/bucket/terminal-ui.ts:130-132`** - Remove unreachable code instead of testing
5. **`lib/bucket/terminal-ui.ts:366-368`** - Remove fallback that can never trigger

## Open Questions

### Should unreachable code be deleted or kept defensively?

#### Delete unreachable code

If code is mathematically impossible to reach, it serves no purpose and misleads readers. Delete it and remove the exclusion.

#### Keep with exclusion

Defensive coding prevents bugs if assumptions change. The exclusion documents the unreachability. Safer to keep than delete.

### Which 5 exclusions provide the most value to fix?

#### Prioritize testable logic over wrappers

Focus on exclusions where real logic is skipped (error handlers, guards) rather than pure wrappers. This gives better regression coverage.

#### Prioritize easy wins

Fix whichever 5 are simplest to test, regardless of logic complexity. Gets the task done faster and establishes patterns for future fixes.

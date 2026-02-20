# Fix coverage gaps

Research identified v8 ignore blocks that could be restructured to increase coverage. Most existing ignore blocks are appropriate dependency-injection seams, but three areas have potential for improvement through refactoring.

## Top 3 Offenders

### 1. `lib/cli/commands/bucket.ts` - Consolidated dependency factory

The file contains 7+ separate ignore blocks (lines 91-213) for thin wrappers: `defaultCreateWebSocket`, `defaultSetupKeypress`, `defaultSetupSignals`, `defaultSetupResize`, `defaultGetTerminalSize`, `defaultWriteStdout`, `defaultCreateServer`, `defaultOpenBrowser`. The entire file is excluded from coverage in `vitest.config.ts` because v8 doesn't properly track function-level ignore comments.

**Why it's an offender**: The file is completely excluded from coverage reporting. While individual thin wrappers are appropriate, the `createDefaultBucketDependencies` factory (lines 215-265) contains substantial logic (authFileSystem setup, conditional environment variable handling) that could be covered.

**Restructuring opportunity**: Extract the factory's non-trivial logic (like `authFileSystem` construction and environment variable handling) into testable functions. Keep only the truly thin wrappers in ignore blocks, then remove the file from `vitest.config.ts` exclusions.

### 2. `lib/cli/commands/loop.ts:410-414` - Log statement in catch block

```typescript
/* v8 ignore start - log is a no-op in test (no DEBUG) */
log(
  `${agentName} error on task ${task.title ?? task.path}: ${errorMessage}`
)
/* v8 ignore stop */
```

**Why it's an offender**: The existing review notes this has "the weakest justification." The error handling around it is already tested; only the log statement is excluded.

**Restructuring opportunity**: Inject the logger as a dependency, or enable DEBUG in the test environment. The log call could then be covered, removing the ignore block entirely.

### 3. `lib/bucket/repository.ts:116-129` - Default dependencies factory

The `createDefaultRepositoryDependencies` function is wrapped in an ignore block, and the entire file is excluded from coverage.

**Why it's an offender**: Like bucket.ts, this file is excluded entirely. The factory contains environment variable handling (`DUST_REPOS_DIR`) and creates a FileSystem dependency that could be tested.

**Restructuring opportunity**: Extract environment variable handling into a separate testable function. The thin wrappers (`sleep`, `spawn`) would remain ignored, but the configuration logic would be covered.

## What won't help

The two ignore blocks in `lib/bucket/terminal-ui.ts` (lines 119-121 and 355-357) are genuinely unreachable defensive code. They guard against impossible states (loop that always returns earlier, map lookup that can't miss). These should remain as-is.

## Open Questions

### Should the logger be injected as a dependency to enable coverage of log statements?

#### Option: Inject logger dependency
Modify functions that log errors to accept a logger dependency. Tests could then provide a mock logger and verify log calls. This removes the need for ignore blocks around log statements and makes logging behavior explicitly testable.

#### Option: Enable DEBUG in test environment
Run tests with `DEBUG=dust:*` enabled. This would exercise log statements but adds noise to test output and may have performance implications. The log statements are still not meaningfully "tested" - they just execute.

#### Option: Keep log ignores
Log statements are side effects with no return value. Covering them adds test complexity without meaningful assertions. The error handling paths are already tested.

### Should file-level exclusions be removed once thin wrapper logic is extracted?

#### Option: Remove exclusions after refactoring
Once non-trivial logic is extracted from factory functions, remove `bucket.ts`, `repository.ts`, and `repository-loop.ts` from `vitest.config.ts` exclusions. Individual thin wrappers would still use inline ignores.

#### Option: Keep file-level exclusions
The v8 function-level metrics issue may resurface. File-level exclusions are stable and low-maintenance. Only remove them when v8/vitest fixes the underlying issue.

### How much factory logic is worth extracting for testability?

#### Option: Extract only substantial logic
Only extract code that has conditional paths or non-trivial behavior (environment variable handling, FileSystem construction). Leave trivial one-liners as is.

#### Option: Extract everything possible
Maximize coverage by extracting all logic that isn't a direct native wrapper. This may create many small functions but ensures maximum coverage.

#### Option: Keep factories as-is
The cost of extraction outweighs the benefit. These are stable, simple patterns that rarely change.

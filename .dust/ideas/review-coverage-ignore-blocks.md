# Review coverage ignore blocks

The codebase contains multiple `/* v8 ignore */` blocks that exclude code from coverage metrics. While some are necessary due to v8 limitations, others may be candidates for refactoring to improve testability.

## Current Coverage Ignore Blocks

The codebase has **19 distinct coverage ignore blocks** across 5 files:

### By Category

**1. Native API Wrappers** (10 blocks)
Simple wrappers around Node.js/Bun APIs that are impractical to unit test:
- `lib/cli/commands/bucket.ts`: `defaultCreateWebSocket`, `defaultSetupKeypress`, `defaultSetupSignals`, `defaultSetupResize`, `defaultGetTerminalSize`, `defaultWriteStdout`, `defaultCreateServer`, `defaultOpenBrowser`, `createDefaultBucketDependencies`
- `lib/cli/commands/bucket-asset-upload.ts`: `defaultCreateServer`, `defaultOpenBrowser`, `createDefaultUploadDependencies`
- `lib/cli/commands/loop.ts`: `defaultPostEvent`
- `lib/bucket/repository.ts`: `createDefaultRepositoryDependencies`

**2. v8 Callback Tracking Limitation** (6 blocks)
Blocks where v8 cannot track coverage inside async callbacks, documented in `vitest-testing.md`:
- `lib/bucket/repository-loop.ts`: Lines 63-73, 94-110, 148-163, 226-236 (callback internals)
- `lib/cli/commands/bucket.ts`: Lines 661-698, 704-725 (async callback handlers)

**3. Defensive Error Handlers** (2 blocks)
Error handling code that's difficult to trigger in tests:
- `lib/bucket/repository-loop.ts`: Lines 197-213 (iteration error catch block)
- `lib/bucket/repository.ts`: Lines 101-110 (loop crash handler)

**4. Unreachable Code Guards** (2 blocks)
Code that's theoretically unreachable due to earlier guards:
- `lib/bucket/terminal-ui.ts`: Lines 119-121 (truncateLine fallback return)
- `lib/bucket/terminal-ui.ts`: Lines 355-357 (repoColors fallback)

## Top 3 Candidates for Removal via Dependency Injection

### Candidate 1: `defaultPostEvent` in `lib/cli/commands/loop.ts`

**Location:** Lines 144-155

**Current Code:**
```typescript
/* v8 ignore start - thin wrapper around fetch, tested via integration */
async function defaultPostEvent(
  url: string,
  payload: EventMessage
): Promise<void> {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
/* v8 ignore stop */
```

**Why it's a good candidate:**
- Small, focused function with clear interface
- `fetch` could be injected via `LoopDependencies`
- The function exists specifically because `fetch` is a global

**Proposed Change:**
Add `fetch` to `LoopDependencies` interface and inject it into `defaultPostEvent`.

### Candidate 2: `createDefaultRepositoryDependencies` in `lib/bucket/repository.ts`

**Location:** Lines 120-132

**Current Code:**
```typescript
/* v8 ignore start - simple wrappers around native functions */
export function createDefaultRepositoryDependencies(
  fileSystem: FileSystem
): RepositoryDependencies {
  return {
    spawn: nodeSpawn,
    run: claudeRun,
    fileSystem,
    sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    getReposDir: () => getReposDir(process.env, homedir()),
  }
}
/* v8 ignore stop */
```

**Why it's a good candidate:**
- Already follows partial DI pattern (accepts `fileSystem`)
- Could accept `process.env` and `homedir` as parameters
- Would enable testing `getReposDir` logic with different environments

**Proposed Change:**
Extend function signature to accept `env` and `homeDir` parameters.

### Candidate 3: Duplicated `defaultCreateServer`/`defaultOpenBrowser` in bucket commands

**Location:**
- `lib/cli/commands/bucket.ts`: Lines 174-213
- `lib/cli/commands/bucket-asset-upload.ts`: Lines 73-111

**Current Code:**
Both files contain nearly identical implementations of `defaultCreateServer` and `defaultOpenBrowser`.

**Why it's a good candidate:**
- Code duplication violates DRY
- Consolidating to a shared module enables single coverage ignore
- Shared auth infrastructure (`AuthDependencies`) already exists but doesn't include these

**Proposed Change:**
Move `defaultCreateServer` and `defaultOpenBrowser` to `lib/bucket/auth.ts` or create a new `lib/bucket/server-utils.ts`, then update `AuthDependencies` to include these.

## Open Questions

### Should we prioritize based on test value or coverage line reduction?

#### Option: Prioritize test value

Focus on changes that enable meaningful new tests, even if they don't significantly reduce the number of ignored lines. Example: Injecting `fetch` into `defaultPostEvent` enables testing error handling paths.

#### Option: Prioritize coverage line reduction

Focus on changes that remove the most ignored lines with the least code change. Example: Consolidating the duplicated server code removes ~80 lines of ignore blocks.

### How much refactoring is acceptable?

#### Option: Minimal changes within existing architecture

Only inject dependencies where interfaces already exist. Don't create new abstraction layers.

#### Option: Allow structural refactoring where it improves design

Create new shared modules or expand existing interfaces if it improves both testability and code organization.

### Should v8 callback limitation blocks be addressed?

#### Option: Leave v8 limitation blocks as-is

The v8 callback tracking limitation is documented and understood. These blocks will become testable when v8 fixes the upstream issue. Focus effort elsewhere.

#### Option: Refactor callbacks to be testable

Extract callback logic into named functions that can be tested independently, even though v8's function-level tracking issue still requires file exclusions.

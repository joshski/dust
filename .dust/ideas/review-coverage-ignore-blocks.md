# Review coverage ignore blocks

The codebase uses `/* v8 ignore start */` / `/* v8 ignore stop */` comments to exclude code from coverage reporting. There are 12 ignore blocks across 4 files. Each block should be reviewed to determine whether it is still necessary, or whether the code could be tested or restructured to remove the ignore.

## Current ignore blocks

### `lib/bucket/terminal-ui.ts` (2 blocks)
- **Line 119**: "unreachable: visibleLength guard on line 80 ensures truncation always occurs above" — guards a return statement after a for-loop that should always return earlier. Likely genuinely unreachable.
- **Line 355**: "fallback unreachable: repoColors is built from the same repositories array" — a nullish coalescing fallback on a map lookup that can't miss. Likely genuinely unreachable.

### `lib/bucket/repository.ts` (1 block)
- **Lines 116–129**: "simple wrappers around native functions" — `createDefaultRepositoryDependencies`, a factory that returns real implementations (spawn, sleep, etc). This is the dependency-injection seam; the whole file is excluded from coverage in `vitest.config.ts` because v8 doesn't honor ignore comments for function-level metrics.

### `lib/cli/commands/bucket.ts` (8 blocks)
- **Lines 91–299**: Eight blocks covering thin wrappers: `defaultCreateWebSocket`, `defaultSetupKeypress`, `defaultSetupSignals`, `defaultSetupResize`, `defaultGetTerminalSize`, `defaultWriteStdout`, `defaultCreateServer`, `defaultOpenBrowser`. All are dependency-injection seams. The entire file is excluded from coverage in `vitest.config.ts`.

### `lib/cli/commands/loop.ts` (1 block)
- **Lines 144–155**: `defaultPostEvent` — a thin fetch wrapper. Dependency-injection seam.

## Observations

1. **Three entire files are excluded from coverage in `vitest.config.ts`** (`repository.ts`, `repository-loop.ts`, `bucket.ts`) specifically because v8 doesn't properly handle ignore comments for function/branch metrics. If v8 fixes this upstream, these file-level exclusions could be removed and the inline ignores would suffice.
2. **Most blocks are dependency-injection seams** — factory functions that return real implementations. These are a deliberate pattern (consistent with the `dependency-injection` and `functional-core-imperative-shell` principles). The ignores are appropriate.
3. **Two blocks guard genuinely unreachable defensive code** in `terminal-ui.ts`. These could be removed if TypeScript's type system could prove unreachability, but at runtime they're safety nets.

## Open Questions

### What should happen when v8 fixes function-level ignore comment support?

#### Option: Proactively track the v8 issue and remove file-level exclusions when fixed
Add a task or periodic check to revisit `vitest.config.ts` exclusions.

#### Option: Wait until a vitest/v8 upgrade naturally resolves it
The current workaround is stable and low-cost. Revisit opportunistically.

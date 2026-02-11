# Refactor towards imperative shell, functional core

Separate pure decision-making and formatting logic from I/O side effects across command handlers. The "functional core" contains pure functions that take data in and return data out. The "imperative shell" is a thin layer that performs file I/O, console output, and process spawning.

## Open Questions

### Which areas should we prioritize first?

#### init command

The `init` function in `lib/cli/commands/init.ts` interleaves file creation attempts with display logic. Each `try/catch` block both performs I/O and decides what to display. Extracting a pure `planInitialization` -> `executeInitialization` -> `formatInitResult` pipeline would make the logic testable without mocking the filesystem.

#### check command display logic

The `displayResults` function in `lib/cli/commands/check.ts` mixes pass/fail categorization, timing formatting, and hint rendering with `context.stdout` calls. Extracting `formatCheckResults(results: CheckResult[]) -> string[]` as a pure function would separate the formatting concern cleanly.

#### list command

The `list` function in `lib/cli/commands/list.ts` reads files, extracts metadata, and formats output in a single loop. Splitting into `gatherItemMetadata` (I/O) -> `formatItemsList` (pure) would follow the pattern already established in `lint-markdown.ts`.

### Should we introduce a consistent return-then-render pattern?

#### Yes, commands return structured data and a separate layer renders

Commands return a result object (e.g., `{ items: [], warnings: [], created: [] }`) and a thin rendering layer calls `context.stdout`. This is how `lint-markdown.ts` already works with its `Violation[]` array. Extending this pattern to all commands would make them uniformly testable and composable.

#### No, keep the current approach where commands own their output

The current approach is simpler for small commands. Adding a rendering layer may over-abstract commands that are unlikely to have multiple output formats. The dependency injection via `CommandDependencies` already provides testability.

### Should we extract formatting into a shared module?

#### Yes, create a shared formatting module

A `lib/cli/formatting.ts` module could hold pure functions like `formatTiming(ms)`, `formatPassFail(passed, total)`, `formatFileList(files)` that multiple commands reuse. This reduces duplication and keeps commands focused on orchestration.

#### No, keep formatting co-located with commands

Co-located formatting is easier to find and modify. Shared modules risk becoming grab-bags. The current per-command structure is clear enough.

# Show relative paths in validation errors

Show validation error file paths relative to the current working directory so lint output is shorter and easier to scan.

Today, lint and validation paths are mostly absolute because file paths are constructed from `context.cwd` and propagated through `Violation.file`.

Relevant code paths:

- `lintMarkdown` builds `dustPath` as `${context.cwd}/.dust` and prints `v.file` directly in the final violation formatter (`lib/cli/commands/lint-markdown.ts`).
- `validatePatch` accepts an absolute `dustPath`, builds absolute `filePath` values, and returns them in `ValidationResult.violations` (`lib/validation/index.ts`).
- The shared `Violation` type only has `file`, `message`, and optional `line`, with no explicit absolute/relative contract (`lib/lint/validators/types.ts`).
- Existing tests commonly assert absolute paths in violation data (for example `lib/validation/validation.test.ts` and several lint tests that inspect stderr output).

This change aligns with [Actionable Errors](../principles/actionable-errors.md) and [Context Window Efficiency](../principles/context-window-efficiency.md): less path noise makes failures faster to interpret for both humans and agents.

## Proposed Direction

Keep validators unchanged and centralize path formatting at the CLI output boundary for `dust lint`.

That means violations can continue storing canonical absolute paths internally, while CLI rendering converts each file path to a cwd-relative display path right before printing.

## Open Questions

### Should this change apply only to CLI rendering, or also to the `validatePatch` API result?

#### CLI rendering only

Convert absolute paths to relative only when printing command output. This is low-risk and avoids a breaking change for `@joshski/dust/validation` consumers that may already rely on absolute paths.

#### CLI and API

Return relative paths from `validatePatch` and other violation producers. This gives consistent path shape everywhere, but changes the current de facto API behavior and likely requires a versioned migration.

### Relative to which base should paths be displayed?

#### `context.cwd` (or current process cwd)

Use cwd-relative paths as the default display format, matching the idea description and typical CLI expectations.

#### `.dust` directory root

Display paths relative to `.dust/` instead (for example `tasks/my-task.md`). This is even shorter for artifact validation, but diverges from the stated "relative to cwd" direction and may be less consistent with non-`.dust` validation paths.

### How should we handle paths that cannot be cleanly relativized to cwd?

#### Fall back to absolute path

If relative conversion would escape cwd or produce unclear output, print the original absolute path. Most robust for edge cases.

#### Always print computed relative path (including `../`)

Always show the relative result, even with parent traversals. Consistent formatting, but can become less readable in unusual setups.

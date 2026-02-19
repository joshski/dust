# Increase type safety

The codebase has several patterns where types are loose or assertions are used to work around TypeScript limitations. Tightening these improves compile-time error detection and reduces runtime surprises.

## Current State

### Tool Input Typing

The `ToolUseEvent` type in `lib/claude/types.ts:8` uses `Record<string, unknown>` for tool inputs. Each tool formatter in `lib/claude/tool-formatters.ts` then casts fields like `input.file_path as string | undefined`. This pattern appears in formatters for Write, Edit, Read, Bash, TodoWrite, Grep, Glob, and Task.

The loose typing is pragmatic: Claude's streaming protocol produces JSON objects with varying shapes, and the formatter only extracts fields it recognizes. However, it means type errors (e.g., accessing a misspelled field) are not caught at compile time.

### Error Handling Assertions

Multiple files use `(error as NodeJS.ErrnoException).code === 'ENOENT'` to check for file-not-found errors:
- `lib/git/hooks.ts:69,97,120,132`
- `lib/lint/validators/directory-validator.ts:20,70`
- `lib/cli/commands/lint-markdown.ts:63,112,130,161,208,233,284`
- `lib/cli/commands/init.ts:88,103,138,157`
- `lib/cli/commands/migrate.ts:24`

This pattern is common in Node.js code because `catch` blocks receive `unknown`. A type guard would centralize the logic and eliminate the repeated assertions.

### Raw Event Typing

`RawEvent = Record<string, unknown>` in `lib/claude/types.ts:1` is the entry point for all Claude streaming events. The `AgentSessionEvent` union in `lib/agent-events.ts` also uses `Record<string, unknown>` for the `rawEvent` payload in `claude-event` variants.

Events are parsed from JSON lines without validation. A more type-safe approach would use a parser that validates the shape at runtime and returns typed results.

### Test Mocking Patterns

Test files use double casts (`as unknown as SomeType`) extensively when mocking:
- `lib/bucket/auth.test.ts:102,111,123,180` — `as unknown as typeof fetch`
- `lib/cli/colors.test.ts:17,22,52,59,98` — `as unknown as { isTTY: ... }`
- `lib/cli/commands/loop.test.ts:42,45` — EventEmitter mocking

Double casts bypass type checking entirely. This aligns with the project's [Stubs Over Mocks](../principles/stubs-over-mocks.md) principle, which recommends in-memory emulators over mocks. However, some mocking is necessary for tests involving external processes or network calls.

## Open Questions

### Should tool inputs have per-tool types?

#### Define discriminated union types for each tool

Create types like `WriteInput`, `EditInput`, `BashInput` etc., with a union `ToolInput = WriteInput | EditInput | ...`. The event parser would validate against this union. Type guards would narrow to the specific input type in each formatter.

Benefits: Full type safety in formatters; invalid field access caught at compile time.

Costs: Requires maintaining types that mirror Claude's API; adds validation overhead; types may drift if Claude adds new fields.

#### Keep `Record<string, unknown>` with documented conventions

The current approach works. Document the expected fields for each tool in comments. Accept that formatters must handle unexpected shapes gracefully.

Benefits: Simple; resilient to API changes; no validation overhead.

Costs: No compile-time checking of field names; easy to make typos.

### Should a shared type guard handle `NodeJS.ErrnoException`?

#### Create `isErrnoException(error: unknown): error is NodeJS.ErrnoException`

A single type guard used everywhere. Eliminates repeated `as` casts. Makes the pattern discoverable and consistent.

#### Keep inline assertions

The current pattern is explicit at each call site. Adding a utility function introduces indirection for a simple check.

### How should raw events be validated?

#### Use a schema validation library (e.g., zod)

Parse incoming JSON with a schema that produces typed results. Invalid events are caught early. Works well with the existing discriminated union approach.

Trade-off: Adds a dependency (counter to [Minimal Dependencies](../principles/minimal-dependencies.md)), though zod is small and has no transitive dependencies.

#### Use manual type guards

Write runtime checks for expected event shapes without adding dependencies. More verbose but keeps the dependency tree minimal.

#### Accept loose typing for external input

The streaming protocol is owned by Claude Code, not this project. Strict typing adds maintenance burden when the upstream format changes. Loose typing with defensive access is pragmatic.

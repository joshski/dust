# Improve Type Safety

The codebase has several patterns where runtime casts bypass the type checker. `RawEvent` is typed as `Record<string, unknown>`, forcing `as` casts throughout `event-parser.ts`, `tool-formatters.ts`, and `loop.ts`. `NodeJS.ErrnoException` casts are scattered across multiple files. `JSON.parse` returns `any` in settings loading without validation.

This task introduces targeted type narrowing to eliminate the most impactful `as` casts and make the type system catch more bugs at compile time.

## Changes

### 1. Type raw events with a discriminated union (`lib/claude/types.ts`)

Replace `RawEvent = Record<string, unknown>` with a discriminated union covering the four known event shapes, plus a fallback:

```typescript
type RawStreamEvent = {
  type: 'stream_event'
  event?: { delta?: { type?: string; text?: string } }
  session_id?: string
}

type RawAssistantEvent = {
  type: 'assistant'
  message?: {
    content?: Array<{
      type: string
      id?: string
      name?: string
      input?: Record<string, unknown>
      text?: string
    }>
  }
}

type RawUserEvent = {
  type: 'user'
  message?: {
    content?: Array<{
      type: string
      tool_use_id?: string
      content?: unknown
    }>
  }
}

type RawResultEvent = {
  type: 'result'
  subtype?: string
  result?: string
  error?: string
  cost_usd?: number
  total_cost_usd?: number
  duration_ms?: number
  num_turns?: number
  session_id?: string
}

type RawUnknownEvent = {
  type: string
  session_id?: string
  [key: string]: unknown
}

export type RawEvent =
  | RawStreamEvent
  | RawAssistantEvent
  | RawUserEvent
  | RawResultEvent
  | RawUnknownEvent
```

This lets `parseRawEvent` in `lib/claude/event-parser.ts` use a `switch` on `raw.type` with proper narrowing, eliminating all 5 `as` casts in that file.

### 2. Eliminate `as` casts in event-parser (`lib/claude/event-parser.ts`)

Rewrite `parseRawEvent` to use a `switch` statement on `raw.type`. Each case branch gets automatic narrowing from the discriminated union, so the `as { event?: ... }`, `as { message?: ... }`, and `as { subtype?: string; ... }` casts can all be removed.

For the `'result'` branch, replace the unsafe `(r.subtype as 'success' | 'error')` cast with a runtime guard:

```typescript
subtype: raw.subtype === 'error' ? 'error' : 'success',
```

### 3. Add an `isNodeError` type guard (`lib/cli/types.ts`)

Add a utility type guard to replace the 13 scattered `(error as NodeJS.ErrnoException).code === 'ENOENT'` casts across `lint-markdown.ts`, `hooks.ts`, `init.ts`, and `test-utilities.ts`:

```typescript
export function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === code
}
```

Then update all call sites from:
```typescript
if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
```
to:
```typescript
if (isNodeError(error, 'ENOENT')) {
```

### 4. Validate `JSON.parse` output in settings (`lib/config/settings.ts`)

Change the `loadSettings` function to annotate the `JSON.parse` result as `unknown` and validate properties before spreading:

```typescript
const parsed: unknown = JSON.parse(content)
if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
  return { dustCommand: detectDustCommand(cwd, fileSystem) }
}
const config = parsed as Record<string, unknown>
const result: DustSettings = {
  ...DEFAULT_SETTINGS,
}
if (typeof config.dustCommand === 'string') {
  result.dustCommand = config.dustCommand
}
if (typeof config.eventsUrl === 'string') {
  result.eventsUrl = config.eventsUrl
}
if (isCheckConfigArray(config.checks)) {
  result.checks = config.checks
}
```

### 5. Use `RawEvent` type consistently in loop (`lib/cli/commands/loop.ts`)

Replace `Record<string, unknown>` with `RawEvent` in:
- `ClaudeRawEvent.rawEvent` field (line 67)
- `IterationOptions.onRawEvent` callback parameter (line 258)
- `loopClaude` inline callback parameter (line 397)

### 6. Type the `formatters` map with known tool names (`lib/claude/tool-formatters.ts`)

Define a `KnownToolName` type and use it to key the formatters map:

```typescript
type KnownToolName = 'Write' | 'Edit' | 'Read' | 'Bash' | 'TodoWrite' | 'Grep' | 'Glob' | 'Task'
const formatters: Record<KnownToolName, ToolFormatter> = { ... }
```

This ensures the map stays in sync with the defined formatters at compile time.

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Maintainable Codebase](../goals/maintainable-codebase.md)

## Blocked By

(none)

## Definition of Done

- [ ] `RawEvent` in `lib/claude/types.ts` is a discriminated union instead of `Record<string, unknown>`
- [ ] All `as` casts in `lib/claude/event-parser.ts` are eliminated
- [ ] An `isNodeError` type guard in `lib/cli/types.ts` replaces scattered `(error as NodeJS.ErrnoException).code` casts
- [ ] `JSON.parse` result in `lib/config/settings.ts` is validated before use
- [ ] `Record<string, unknown>` references in `lib/cli/commands/loop.ts` replaced with `RawEvent`
- [ ] `formatters` map in `lib/claude/tool-formatters.ts` uses a typed key
- [ ] All existing tests pass
- [ ] `tsc --noEmit` passes with no errors

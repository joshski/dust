# Extract repository loop callbacks

Extract callback logic from `repository-loop.ts` into named functions that can be tested independently.

## Background

The `runRepositoryLoop` function in `lib/bucket/repository-loop.ts` contains several inline callbacks marked with `/* v8 ignore */` due to v8's inability to track coverage inside async callbacks. While the v8 limitation remains, extracting the callback logic into named functions enables testing the logic independently.

## Callbacks to Extract

### 1. Log line callbacks (lines 63-73)

The `CommandDependencies` stdout/stderr callbacks:
```typescript
stdout: (msg: string) => appendLogLine(repoState.logBuffer, createLogLine(msg, 'stdout'))
stderr: (msg: string) => appendLogLine(repoState.logBuffer, createLogLine(msg, 'stderr'))
```

Extract to a factory function:
```typescript
function createLogCallbacks(logBuffer: LogBuffer): { stdout: (msg: string) => void; stderr: (msg: string) => void }
```

### 2. Stdout sink line handler (lines 94-110)

The `createStdoutSink().line` callback that flushes partial text and splits multi-line content.

Extract the logic to:
```typescript
function flushAndLogMultiLine(partialLine: string, text: string, logBuffer: LogBuffer): string
```

### 3. Event message builder (lines 148-163)

The callback that constructs and sends `EventMessage` objects.

Extract to:
```typescript
function buildEventMessage(params: { sequence: number; sessionId: string; repository: string; event: AgentSessionEvent; agentSessionId?: string }): EventMessage
```

### 4. Wake-up promise handler (lines 226-236)

The promise callback that manages the wake-up signal.

Extract to:
```typescript
function createWakeUpHandler(repoState: RepositoryState): () => void
```

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)
- [Dependency Injection](../principles/dependency-injection.md)

## Blocked By

(none)

## Definition of Done

- [ ] Callback logic extracted into named, testable functions
- [ ] Extracted functions have unit tests with full coverage
- [ ] Original callbacks become thin wrappers that call the extracted functions
- [ ] `/* v8 ignore */` comments remain on the thin callback wrappers (v8 limitation)
- [ ] Existing tests continue to pass
- [ ] `vitest-testing.md` fact remains accurate (file-level exclusions still needed for function metrics)

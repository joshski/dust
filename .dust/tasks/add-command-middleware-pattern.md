# Add Command Middleware Pattern

Add middleware support to the CLI command system for cross-cutting concerns.

## Background

Commands in `lib/cli/main.ts` currently handle cross-cutting concerns ad-hoc. Guards, logging, and error handling are embedded directly in command bodies, leading to duplication and inconsistency. A middleware layer allows these concerns to be composed separately from command logic.

The resolved questions from the original idea established:
- Middleware is worth adding now (42 commands benefit from consistent handling)
- Middleware has read-only access to dependencies (simpler mental model)

## Implementation

Following [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md), the middleware system should be a pure function that transforms command execution without side effects in the core logic.

### Define middleware interface

Create `lib/cli/middleware.ts` with:

```typescript
interface CommandMiddleware {
  before?(command: string, dependencies: CommandDependencies): Promise<void | CommandResult>
  after?(command: string, result: CommandResult): Promise<CommandResult>
}

function applyMiddleware(
  middlewares: CommandMiddleware[],
  execute: (command: string, deps: CommandDependencies) => Promise<CommandResult>
): (command: string, deps: CommandDependencies) => Promise<CommandResult>
```

The `applyMiddleware` function is pure: it takes a list of middlewares and an executor, returning a new executor with middleware applied. This keeps the functional core separate from the imperative shell in `main.ts`.

### Integrate into command dispatch

In `lib/cli/main.ts`, wrap `runCommand` with middleware:

```typescript
const executeWithMiddleware = applyMiddleware(
  middlewares,
  (command, deps) => commandRegistry[command](deps)
)
```

### Add one concrete middleware

Implement `TracingMiddleware` that adds trace ID correlation to command execution:
- Sets `DUST_TRACE_ID` in context if not already present
- Logs trace ID for debugging cross-system correlation

This demonstrates the pattern working end-to-end with a useful, testable example.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Design for Testability](../principles/design-for-testability.md)
- [Decoupled Code](../principles/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- `CommandMiddleware` interface defined in `lib/cli/middleware.ts`
- `applyMiddleware` function composes middlewares into executor
- `main.ts` uses middleware-wrapped command execution
- `TracingMiddleware` implemented as proof of concept
- Unit tests cover middleware composition and execution order
- Existing command behavior unchanged (middleware is additive)

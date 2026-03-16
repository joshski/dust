# Command Middleware Pattern

Add middleware/interceptor support to the CLI command system for cross-cutting concerns like logging, error handling, and guards.

## Current State

Commands in `lib/cli/commands/` are registered in [`lib/cli/main.ts`](../../lib/cli/main.ts) via a flat registry:

```typescript
const commandRegistry = {
  init,
  lint: lintMarkdown,
  list,
  'new task': newTask,
  'pick task': pickTask,
  // ...42 commands
}
```

Each command has its own signature and handles cross-cutting concerns ad-hoc:

```typescript
export async function agent(
  dependencies: CommandDependencies,
  env: NodeJS.ProcessEnv = process.env
): Promise<CommandResult> {
  // Ad-hoc guard
  if (env[DUST_SKIP_AGENT] === '1') {
    context.stdout(...)
    return { exitCode: 0 }
  }
  // Implementation...
}
```

Cross-cutting concerns are duplicated or inconsistent across commands:
- Error handling varies
- Logging is inconsistent
- Pre/post execution hooks don't exist
- Guard conditions are embedded in command bodies

## Proposed Pattern

Add a middleware layer to the command dispatcher:

```typescript
interface CommandMiddleware {
  before?(command: string, dependencies: CommandDependencies): Promise<void | CommandResult>
  after?(command: string, result: CommandResult): Promise<CommandResult>
}

class CommandDispatcher {
  private middlewares: CommandMiddleware[] = []

  use(middleware: CommandMiddleware): this {
    this.middlewares.push(middleware)
    return this
  }

  async dispatch(command: string, dependencies: CommandDependencies): Promise<CommandResult> {
    for (const middleware of this.middlewares) {
      if (middleware.before) {
        const result = await middleware.before(command, dependencies)
        if (result) return result  // Early exit if middleware returns result
      }
    }

    let result = await executeCommand(command, dependencies)

    for (const middleware of this.middlewares.reverse()) {
      if (middleware.after) {
        result = await middleware.after(command, result)
      }
    }

    return result
  }
}
```

Example middleware:
- `LoggingMiddleware` — log command start/end with timing
- `ErrorBoundaryMiddleware` — catch unhandled errors, format nicely
- `SkipAgentMiddleware` — check `DUST_SKIP_AGENT` before agent commands

## Trade-offs

### Benefits

- **Separation of concerns** — cross-cutting logic lives in middleware, not commands
- **Composability** — middleware can be combined in different configurations
- **Testability** — middleware tested independently of commands
- **Consistency** — same behavior applied uniformly across commands
- **Extensibility** — new cross-cutting concerns added without touching commands

### Costs

- **Indirection** — harder to trace execution path through middleware chain
- **Complexity** — adds abstraction that may not be needed for 42 commands
- **Migration** — existing ad-hoc handling needs migration
- **Ordering** — middleware order matters and can be subtle

## Open Questions

### Is middleware worth the abstraction for the current command count?

#### Option: Add middleware now

42 commands is enough to benefit from consistent cross-cutting handling. The pattern will also make adding new commands cleaner.

#### Option: Wait until pain is clearer

The current ad-hoc approach works. Add middleware only when duplication becomes a maintenance burden.

### Should middleware be able to modify command arguments?

#### Option: Read-only access to dependencies

Middleware observes but doesn't modify. Simpler mental model, commands get predictable inputs.

#### Option: Allow dependency transformation

Middleware can wrap or modify dependencies (e.g., add tracing to filesystem operations). More powerful but harder to reason about.

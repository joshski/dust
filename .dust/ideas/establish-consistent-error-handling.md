# Establish consistent error handling

Commands use three different strategies for errors, with no documented convention.

1. `context.stderr()` + return `{ exitCode: 1 }` (e.g., `focus.ts`)
2. `catch` + re-throw (e.g., `init.ts`)
3. Bare `throw new Error()` (e.g., `spawn-claude-code.ts`)

A documented convention would help: user input errors use stderr + exitCode, infrastructure failures throw for the outer handler.

# Faster Check Hook

The `.dust/hooks/check` script runs quality gates sequentially, which is slow. The type checking step (`bunx tsc`) is particularly slow.

## Potential approaches

- **Run steps in parallel** - Tests, linting, link validation, and type checking are independent and could run concurrently
- **Rewrite in TypeScript/JavaScript** - Bash doesn't handle parallelism well; a TypeScript implementation using `Promise.all()` would be cleaner
- **Use incremental type checking** - TypeScript supports `--incremental` with a build info file to speed up subsequent runs
- **Cache bun dependencies** - Ensure `bunx tsc` isn't reinstalling on each run
- **Use project references** - TypeScript project references can speed up type checking for larger codebases

## Requirements

- **Consistent output order** - Even when running in parallel, output should appear in a deterministic order (not interleaved). Buffer each step's output and display sequentially after completion.

## Trade-offs

- Incremental checking requires managing cache files
- Complexity vs speed - the current script is simple and readable

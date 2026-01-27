# Command Tree Check

Replace the `.dust/hooks/check` script with a declarative "tree of commands" defined in `.dust/config/check.json`. This provides a structured way to define quality gates with support for parallel and serial execution.

## Configuration Format

```json
{
  "checks": [
    {
      "name": "format",
      "command": "prettier --write ."
    },
    {
      "parallel": true,
      "checks": [
        {
          "name": "unit tests",
          "command": "npm test"
        },
        {
          "name": "lint",
          "command": "npm run lint"
        },
        {
          "name": "typecheck",
          "command": "tsc --noEmit"
        }
      ]
    },
    {
      "name": "coverage",
      "command": "npm run coverage"
    }
  ]
}
```

The hierarchy nests arbitrarily, allowing sequential and parallel execution to be composed:

1. First, run the formatter (which may modify files with `--write`)
2. Then, run unit tests, lint, and typecheck in parallel (since they're independent)
3. Finally, run coverage (which might depend on test artifacts)

## Execution Behavior

`dust check` manages execution with these properties:

- **Output swallowing** - Command output is captured and hidden unless the command fails
- **Failure surfacing** - When a command fails, its output is piped to stdout
- **Clean summary** - Shows pass/fail status for each check without noisy test runner output

## Example Output

```
✓ unit tests
✗ coverage
[...coverage output shown here because it failed...]

✓ lint

2/3 checks passed
```

## Benefits

- **Reduced context pollution** - Only failed output appears, keeping agent context windows clean
- **Parallel execution** - Independent checks run concurrently for speed
- **Declarative configuration** - JSON config is easier to maintain than bash scripts
- **Consistent experience** - All dust projects have the same check interface

## Relation to Existing Ideas

This builds on the ideas in `faster-check-hook.md` by providing a structured approach to parallel execution with buffered output ordering.

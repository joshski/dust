# Switch to run checks serially

Add a `--serial` flag to `dust check` that runs checks sequentially instead of in parallel.

Currently, `dust check` runs all configured checks in parallel using `Promise.all()`. This maximizes speed, aligning with the [Fast Feedback](../goals/fast-feedback.md) goal. However, there are scenarios where serial execution is preferable.

## Use Cases for Serial Execution

- **Resource contention**: Multiple CPU-intensive checks (e.g., build + typecheck + tests) may compete for resources and actually run slower than sequential execution on some machines.
- **Dependent checks**: Some checks may implicitly depend on others (e.g., tests assume the build completed). While explicit dependencies would be better, serial execution is a quick workaround.
- **Debugging**: When a check fails, serial execution makes it easier to correlate output with the specific check that produced it, since output isn't interleaved.
- **Deterministic output**: CI logs may be easier to read when checks run in a predictable order.

## Proposed CLI Usage

```bash
dust check --serial
```

## Implementation Notes

The change would be localized to `lib/cli/commands/check.ts`. The `runConfiguredChecks` function currently uses `Promise.all()` to run checks in parallel. With `--serial`, it would iterate through checks sequentially using a `for...of` loop instead.

The built-in `lint markdown` check and configured checks would both respect the flag.

## Open Questions

### Should serial execution be configurable globally in settings.json?

#### Yes, add a setting

Add `"checkMode": "parallel" | "serial"` to settings.json. The `--serial` flag would override the setting. This lets teams with slower machines or specific needs default to serial without passing the flag every time.

#### No, keep it as a CLI flag only

Keep configuration minimal. Users who consistently want serial can alias the command or set up a shell function. This avoids adding another setting to maintain and document.

### Should checks support explicit dependencies instead of or in addition to serial mode?

#### Add dependency support

Allow checks to declare dependencies like `{ "name": "test", "command": "npm test", "dependsOn": ["build"] }`. This is more precise than blanket serial execution and still allows independent checks to run in parallel.

#### Serial mode is sufficient for now

Dependency support adds significant complexity. Serial mode solves the immediate problem. If real demand emerges for fine-grained dependencies, it can be added later.

### How should the flag interact with the built-in lint markdown check?

#### Run lint markdown first, then configured checks serially

The built-in check is fast and independent, so it makes sense to always run it first. Then run configured checks in the specified order.

#### Treat lint markdown as just another check in the serial sequence

For consistency, include it in the serial ordering based on when it appears (currently first). This keeps the behavior simple and predictable.

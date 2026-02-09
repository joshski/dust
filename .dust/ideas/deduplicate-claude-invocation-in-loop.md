# Deduplicate Claude invocation in loop

`runOneIteration()` in `loop.ts` contains two nearly identical try/catch blocks for invoking Claude (lines 294-312 and 328-344). Both call `run()` with the same `spawnOptions` shape, emit `claude.ended` with success/failure, and format error messages identically.

The only differences are the prompt string and the return value on success. Extract a helper like:

```typescript
async function invokeClaudeSession(
  prompt: string,
  run: typeof claudeRun,
  cwd: string,
  emit: EmitFn,
  onRawEvent?: (rawEvent: Record<string, unknown>) => void
): Promise<{ success: boolean; error?: string }>
```

Each call site would check `success` and return the appropriate `IterationResult`. This removes the duplicated error formatting and emit logic.

# Test defaultProcessRunner glue code

## Problem

`bun test --coverage` shows lines 20-24 in `lib/cli/check.ts` are uncovered. This is the `defaultProcessRunner` implementation that wraps Node's `spawn`.

## Solution

Refactor `defaultProcessRunner` to use a factory function that accepts `spawn` as a dependency:

```typescript
export type SpawnFn = (
  command: string,
  args: string[],
  options: { cwd: string; stdio: "inherit" }
) => ChildProcess;

export function createProcessRunner(spawnFn: SpawnFn): ProcessRunner {
  return {
    spawn: (command, args, options) => {
      return new Promise((resolve) => {
        const proc = spawnFn(command, args, options);
        proc.on("close", (code) => resolve(code ?? 1));
        proc.on("error", () => resolve(1));
      });
    },
  };
}

export const defaultProcessRunner: ProcessRunner = createProcessRunner(spawn);
```

Then add tests in `check.test.ts`:

```typescript
import { createProcessRunner } from "./check";
import { EventEmitter } from "node:events";

describe("createProcessRunner", () => {
  test("resolves with exit code from close event", async () => {
    const mockProc = new EventEmitter();
    const mockSpawn = () => mockProc as any;
    const runner = createProcessRunner(mockSpawn);

    const promise = runner.spawn("cmd", [], { cwd: "/", stdio: "inherit" });
    mockProc.emit("close", 0);

    expect(await promise).toBe(0);
  });

  test("resolves with 1 when close event has null code", async () => {
    const mockProc = new EventEmitter();
    const mockSpawn = () => mockProc as any;
    const runner = createProcessRunner(mockSpawn);

    const promise = runner.spawn("cmd", [], { cwd: "/", stdio: "inherit" });
    mockProc.emit("close", null);

    expect(await promise).toBe(1);
  });

  test("resolves with 1 on error event", async () => {
    const mockProc = new EventEmitter();
    const mockSpawn = () => mockProc as any;
    const runner = createProcessRunner(mockSpawn);

    const promise = runner.spawn("cmd", [], { cwd: "/", stdio: "inherit" });
    mockProc.emit("error", new Error("spawn failed"));

    expect(await promise).toBe(1);
  });
});
```

This achieves 100% coverage by testing all branches:
- Normal exit with code
- Exit with null code (defaults to 1)
- Error event (returns 1)

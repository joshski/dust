# Test defaultProcessRunner glue code

## Goals

- [Make changes with confidence](../goals/make-changes-with-confidence.md)
- [Fast feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Description

`bun test --coverage` shows lines 20-24 in `lib/cli/check.ts` are uncovered. This is the `defaultProcessRunner` implementation that wraps Node's `spawn`.

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

## Definition of done

- `createProcessRunner` factory function exported from `lib/cli/check.ts`
- `defaultProcessRunner` uses `createProcessRunner(spawn)`
- Tests cover all branches: normal exit, null exit code, and error event
- `bun test --coverage` shows 100% line coverage for `lib/cli/check.ts`

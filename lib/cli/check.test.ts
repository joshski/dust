import { describe, expect, test } from "vitest";
import { check, type ProcessRunner } from "./check";
import type { CommandContext, FileSystem } from "./types";

function createMockContext(): CommandContext & {
  stdoutLines: string[];
  stderrLines: string[];
} {
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  return {
    cwd: "/project",
    stdout: (msg: string) => stdoutLines.push(msg),
    stderr: (msg: string) => stderrLines.push(msg),
    stdoutLines,
    stderrLines,
  };
}

function createMockFs(existingPaths: Set<string> = new Set()): FileSystem {
  return {
    exists: (path: string) => existingPaths.has(path),
    readFile: async () => "",
    writeFile: async () => {},
    mkdir: async () => {},
    readdir: async () => [],
  };
}

function createMockRunner(exitCode: number): ProcessRunner & {
  calls: Array<{ command: string; args: string[]; cwd: string }>;
} {
  const calls: Array<{ command: string; args: string[]; cwd: string }> = [];
  return {
    spawn: async (command, args, options) => {
      calls.push({ command, args, cwd: options.cwd });
      return exitCode;
    },
    calls,
  };
}

describe("check command", () => {
  test("executes hook and returns its exit code on success", async () => {
    const ctx = createMockContext();
    const fs = createMockFs(new Set(["/project/.dust/hooks/check"]));
    const runner = createMockRunner(0);

    const result = await check(ctx, fs, [], runner);

    expect(result.exitCode).toBe(0);
    expect(runner.calls).toHaveLength(1);
    expect(runner.calls[0].command).toBe("/project/.dust/hooks/check");
    expect(runner.calls[0].cwd).toBe("/project");
  });

  test("forwards non-zero exit code from hook", async () => {
    const ctx = createMockContext();
    const fs = createMockFs(new Set(["/project/.dust/hooks/check"]));
    const runner = createMockRunner(1);

    const result = await check(ctx, fs, [], runner);

    expect(result.exitCode).toBe(1);
  });

  test("returns error if hook does not exist", async () => {
    const ctx = createMockContext();
    const fs = createMockFs(); // No hook file
    const runner = createMockRunner(0);

    const result = await check(ctx, fs, [], runner);

    expect(result.exitCode).toBe(1);
    expect(ctx.stderrLines.join("\n")).toContain("No check hook found");
    expect(ctx.stderrLines.join("\n")).toContain(".dust/hooks/check");
    expect(runner.calls).toHaveLength(0);
  });

  test("shows helpful instructions when hook is missing", async () => {
    const ctx = createMockContext();
    const fs = createMockFs();
    const runner = createMockRunner(0);

    await check(ctx, fs, [], runner);

    const output = ctx.stderrLines.join("\n");
    expect(output).toContain("mkdir -p .dust/hooks");
    expect(output).toContain("chmod +x");
  });
});

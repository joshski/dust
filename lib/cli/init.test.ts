import { describe, expect, test } from "bun:test";
import { init } from "./init";
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

function createMockFs(
  existingPaths: Set<string> = new Set()
): FileSystem & { createdDirs: string[]; writtenFiles: Map<string, string> } {
  const createdDirs: string[] = [];
  const writtenFiles = new Map<string, string>();

  return {
    exists: (path: string) => existingPaths.has(path),
    readFile: async () => "",
    writeFile: async (path: string, content: string) => {
      writtenFiles.set(path, content);
    },
    mkdir: async (path: string) => {
      createdDirs.push(path);
    },
    readdir: async () => [],
    createdDirs,
    writtenFiles,
  };
}

describe("init command", () => {
  test("creates .dust directory structure", async () => {
    const ctx = createMockContext();
    const fs = createMockFs();

    const result = await init(ctx, fs, []);

    expect(result.exitCode).toBe(0);
    expect(fs.createdDirs).toContain("/project/.dust");
    expect(fs.createdDirs).toContain("/project/.dust/goals");
    expect(fs.createdDirs).toContain("/project/.dust/ideas");
    expect(fs.createdDirs).toContain("/project/.dust/tasks");
    expect(fs.createdDirs).toContain("/project/.dust/facts");
  });

  test("creates initial goal file", async () => {
    const ctx = createMockContext();
    const fs = createMockFs();

    await init(ctx, fs, []);

    expect(fs.writtenFiles.has("/project/.dust/goals/project-goal.md")).toBe(
      true
    );
    const content = fs.writtenFiles.get("/project/.dust/goals/project-goal.md");
    expect(content).toContain("# Project Goal");
  });

  test("outputs success messages", async () => {
    const ctx = createMockContext();
    const fs = createMockFs();

    await init(ctx, fs, []);

    expect(ctx.stdoutLines.join("\n")).toContain("Initialized Dust repository");
    expect(ctx.stdoutLines.join("\n")).toContain("Created directories");
  });

  test("fails if .dust already exists", async () => {
    const ctx = createMockContext();
    const fs = createMockFs(new Set(["/project/.dust"]));

    const result = await init(ctx, fs, []);

    expect(result.exitCode).toBe(1);
    expect(ctx.stderrLines.join("\n")).toContain("already exists");
  });
});

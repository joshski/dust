import { describe, expect, test } from "vitest";
import { prompt } from "./prompt";
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
  files: Map<string, string> = new Map()
): FileSystem {
  return {
    exists: (path: string) => files.has(path),
    readFile: async (path: string) => files.get(path) || "",
    writeFile: async () => {},
    mkdir: async () => {},
    readdir: async (path: string) => {
      const prefix = path + "/";
      return Array.from(files.keys())
        .filter((f) => f.startsWith(prefix))
        .map((f) => f.slice(prefix.length))
        .filter((f) => !f.includes("/"));
    },
  };
}

describe("prompt command", () => {
  test("outputs prompt content", async () => {
    const ctx = createMockContext();
    const fs = createMockFs(
      new Map([["/project/prompts/work.md", "# Work\n\nDo the work."]])
    );

    const result = await prompt(ctx, fs, ["work"]);

    expect(result.exitCode).toBe(0);
    expect(ctx.stdoutLines.join("\n")).toContain("# Work");
    expect(ctx.stdoutLines.join("\n")).toContain("Do the work.");
  });

  test("fails without prompt name", async () => {
    const ctx = createMockContext();
    const fs = createMockFs();

    const result = await prompt(ctx, fs, []);

    expect(result.exitCode).toBe(1);
    expect(ctx.stderrLines.join("\n")).toContain("Usage:");
  });

  test("fails for non-existent prompt", async () => {
    const ctx = createMockContext();
    const fs = createMockFs(
      new Map([["/project/prompts/work.md", "content"]])
    );

    const result = await prompt(ctx, fs, ["nonexistent"]);

    expect(result.exitCode).toBe(1);
    expect(ctx.stderrLines.join("\n")).toContain("not found");
  });

  test("lists available prompts when not found", async () => {
    const ctx = createMockContext();
    const fs = createMockFs(
      new Map([
        ["/project/prompts/work.md", "content"],
        ["/project/prompts/review.md", "content"],
      ])
    );

    await prompt(ctx, fs, ["nonexistent"]);

    expect(ctx.stderrLines.join("\n")).toContain("Available prompts:");
    expect(ctx.stderrLines.join("\n")).toContain("work");
    expect(ctx.stderrLines.join("\n")).toContain("review");
  });

  test("shows message when prompts directory does not exist", async () => {
    const ctx = createMockContext();
    const fs = {
      exists: () => false,
      readFile: async () => "",
      writeFile: async () => {},
      mkdir: async () => {},
      readdir: async () => {
        throw new Error("ENOENT: no such file or directory");
      },
    };

    const result = await prompt(ctx, fs, ["nonexistent"]);

    expect(result.exitCode).toBe(1);
    expect(ctx.stderrLines.join("\n")).toContain("no prompts directory found");
  });
});

import { describe, expect, test } from "bun:test";
import { next } from "./next";
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

function createMockFs(files: Map<string, string> = new Map()): FileSystem {
  const paths = new Set(files.keys());
  for (const path of files.keys()) {
    let dir = path;
    while (dir.includes("/")) {
      dir = dir.substring(0, dir.lastIndexOf("/"));
      if (dir) paths.add(dir);
    }
  }

  return {
    exists: (path: string) => paths.has(path),
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

describe("next command", () => {
  test("fails if .dust directory not found", async () => {
    const ctx = createMockContext();
    const fs = createMockFs();

    const result = await next(ctx, fs, []);

    expect(result.exitCode).toBe(1);
    expect(ctx.stderrLines.join("\n")).toContain(".dust directory not found");
    expect(ctx.stderrLines.join("\n")).toContain("dust init");
  });

  test("returns empty output when no tasks directory exists", async () => {
    const ctx = createMockContext();
    const fs = createMockFs(
      new Map([["/project/.dust/goals/goal.md", "# My Goal"]])
    );

    const result = await next(ctx, fs, []);

    expect(result.exitCode).toBe(0);
    expect(ctx.stdoutLines).toHaveLength(0);
  });

  test("returns empty output when tasks directory is empty", async () => {
    const ctx = createMockContext();
    // Create .dust and tasks paths but no actual task files
    const files = new Map<string, string>();
    // We need to make the filesystem think .dust/tasks exists
    // Add a dummy non-md file or use a path that creates the directory
    const fs = {
      exists: (path: string) =>
        path === "/project/.dust" || path === "/project/.dust/tasks",
      readFile: async () => "",
      writeFile: async () => {},
      mkdir: async () => {},
      readdir: async () => [] as string[],
    };

    const result = await next(ctx, fs, []);

    expect(result.exitCode).toBe(0);
    expect(ctx.stdoutLines).toHaveLength(0);
  });

  test("lists tasks with no blockers section", async () => {
    const ctx = createMockContext();
    const fs = createMockFs(
      new Map([
        ["/project/.dust/tasks/simple-task.md", "# Simple Task\n\nJust do it."],
      ])
    );

    const result = await next(ctx, fs, []);

    expect(result.exitCode).toBe(0);
    expect(ctx.stdoutLines.join("\n")).toContain("Next tasks:");
    expect(ctx.stdoutLines.join("\n")).toContain("simple-task");
    expect(ctx.stdoutLines.join("\n")).toContain("Simple Task");
  });

  test("filters out tasks with incomplete blockers", async () => {
    const ctx = createMockContext();
    const fs = createMockFs(
      new Map([
        [
          "/project/.dust/tasks/blocked-task.md",
          "# Blocked Task\n\n## Blocked by\n\n- [Blocker](blocker-task.md)",
        ],
        ["/project/.dust/tasks/blocker-task.md", "# Blocker Task\n\nDo first."],
      ])
    );

    const result = await next(ctx, fs, []);

    expect(result.exitCode).toBe(0);
    const output = ctx.stdoutLines.join("\n");
    expect(output).toContain("blocker-task");
    expect(output).not.toContain("blocked-task");
  });

  test("includes tasks whose blockers are all completed (deleted)", async () => {
    const ctx = createMockContext();
    // The blocked-task references a blocker that no longer exists (completed)
    const fs = createMockFs(
      new Map([
        [
          "/project/.dust/tasks/unblocked-task.md",
          "# Unblocked Task\n\n## Blocked by\n\n- [Completed Task](completed-task.md)",
        ],
      ])
    );

    const result = await next(ctx, fs, []);

    expect(result.exitCode).toBe(0);
    const output = ctx.stdoutLines.join("\n");
    expect(output).toContain("Next tasks:");
    expect(output).toContain("unblocked-task");
    expect(output).toContain("Unblocked Task");
  });

  test("handles tasks with (none) in blocked by section", async () => {
    const ctx = createMockContext();
    const fs = createMockFs(
      new Map([
        [
          "/project/.dust/tasks/ready-task.md",
          "# Ready Task\n\n## Blocked by\n\n(none)",
        ],
      ])
    );

    const result = await next(ctx, fs, []);

    expect(result.exitCode).toBe(0);
    const output = ctx.stdoutLines.join("\n");
    expect(output).toContain("Next tasks:");
    expect(output).toContain("ready-task");
    expect(output).toContain("Ready Task");
  });

  test("shows task name without title if no heading exists", async () => {
    const ctx = createMockContext();
    const fs = createMockFs(
      new Map([
        ["/project/.dust/tasks/no-title-task.md", "This task has no heading"],
      ])
    );

    const result = await next(ctx, fs, []);

    expect(result.exitCode).toBe(0);
    const output = ctx.stdoutLines.join("\n");
    expect(output).toContain("no-title-task");
    // Should not have a dash separator without title
    expect(output).not.toContain("no-title-task -");
  });

  test("returns empty when all tasks are blocked", async () => {
    const ctx = createMockContext();
    const fs = createMockFs(
      new Map([
        [
          "/project/.dust/tasks/task-a.md",
          "# Task A\n\n## Blocked by\n\n- [Task B](task-b.md)",
        ],
        [
          "/project/.dust/tasks/task-b.md",
          "# Task B\n\n## Blocked by\n\n- [Task A](task-a.md)",
        ],
      ])
    );

    const result = await next(ctx, fs, []);

    expect(result.exitCode).toBe(0);
    expect(ctx.stdoutLines).toHaveLength(0);
  });

  test("handles multiple blockers where some are complete", async () => {
    const ctx = createMockContext();
    // Blockers on the same line to ensure they're all captured
    const fs = createMockFs(
      new Map([
        [
          "/project/.dust/tasks/multi-blocked.md",
          "# Multi Blocked\n\n## Blocked by\n\n- [Done](done.md), [Still Exists](still-exists.md)",
        ],
        ["/project/.dust/tasks/still-exists.md", "# Still Exists"],
      ])
    );

    const result = await next(ctx, fs, []);

    expect(result.exitCode).toBe(0);
    const output = ctx.stdoutLines.join("\n");
    // multi-blocked should NOT appear because still-exists.md still exists
    expect(output).not.toContain("multi-blocked");
    // still-exists should appear (no blockers)
    expect(output).toContain("still-exists");
  });

  test("lists multiple unblocked tasks sorted alphabetically", async () => {
    const ctx = createMockContext();
    const fs = createMockFs(
      new Map([
        ["/project/.dust/tasks/zebra-task.md", "# Zebra Task"],
        ["/project/.dust/tasks/alpha-task.md", "# Alpha Task"],
        ["/project/.dust/tasks/middle-task.md", "# Middle Task"],
      ])
    );

    const result = await next(ctx, fs, []);

    expect(result.exitCode).toBe(0);
    const output = ctx.stdoutLines.join("\n");
    expect(output).toContain("alpha-task");
    expect(output).toContain("middle-task");
    expect(output).toContain("zebra-task");

    // Verify alphabetical order
    const alphaIndex = output.indexOf("alpha-task");
    const middleIndex = output.indexOf("middle-task");
    const zebraIndex = output.indexOf("zebra-task");
    expect(alphaIndex).toBeLessThan(middleIndex);
    expect(middleIndex).toBeLessThan(zebraIndex);
  });
});
